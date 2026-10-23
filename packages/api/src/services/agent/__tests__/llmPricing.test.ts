import {
  PRICED_MODEL_IDS,
  estimateCostUsd,
  isDeepSeekPeak,
  pricingFor
} from '../llmPricing'

const usage = (inputTokens: number, outputTokens: number, cachedInputTokens = 0) => ({
  inputTokens,
  outputTokens,
  totalTokens: inputTokens + outputTokens,
  cachedInputTokens
})

describe('estimateCostUsd', () => {
  it('prices gpt-4o input and output separately', () => {
    // 1000 in * $2.50/M + 100 out * $10/M = 0.0025 + 0.001
    expect(estimateCostUsd('gpt-4o', usage(1000, 100))).toBeCloseTo(0.0035, 10)
  })

  it('bills cached input at the cached rate', () => {
    // 600 uncached * 2.5 + 400 cached * 1.25 + 0 out, per million
    expect(estimateCostUsd('gpt-4o', usage(1000, 0, 400))).toBeCloseTo(0.002, 10)
  })

  it('never treats more cached tokens than input as a negative charge', () => {
    expect(estimateCostUsd('gpt-4o', usage(100, 0, 500))).toBeCloseTo(0.000125, 10)
  })

  it('supports gpt-4o-mini', () => {
    expect(estimateCostUsd('gpt-4o-mini', usage(1_000_000, 1_000_000))).toBeCloseTo(0.75, 10)
  })

  it('returns zero for an empty run', () => {
    expect(estimateCostUsd('gpt-4o', usage(0, 0))).toBe(0)
  })

  it.each([[undefined], ['custom'], ['o1-mini'], ['claude-3-5-sonnet'], ['claude-haiku-4']])(
    'returns null when the model price is unknown (%p)',
    (model) => {
      expect(estimateCostUsd(model, usage(10, 10))).toBeNull()
    }
  )

  it('returns null when the provider reported no usage', () => {
    expect(estimateCostUsd('gpt-4o', undefined)).toBeNull()
  })
})

describe('pricing by model', () => {
  const offPeak = new Date('2026-10-14T12:00:00Z') // Wednesday 12:00 UTC

  it.each([
    ['gpt-4o', 2.5, 1.25, 10],
    ['gpt-4o-mini', 0.15, 0.075, 0.6],
    ['gpt-4-turbo', 10, 10, 30],
    ['gpt-5.6-luna', 0.2, 0.02, 1.2],
    ['claude-opus-5', 5, 0.5, 25],
    ['claude-sonnet-5', 2, 0.2, 10],
    ['claude-haiku-4-5', 1, 0.1, 5]
  ])('%s costs %d in / %d cached / %d out per million', (model, input, cachedInput, output) => {
    expect(pricingFor(model, offPeak)).toEqual({ input, cachedInput, output })
  })

  it('has a price for every model offered in Settings', () => {
    const offeredInSettings = [
      'gpt-5.6-luna',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'deepseek-flash',
      'claude-sonnet-5',
      'claude-haiku-4-5',
      'claude-opus-5'
    ]

    offeredInSettings.forEach((model) => expect(PRICED_MODEL_IDS).toContain(model))
  })

  it('does not price retired, renamed or nonexistent models', () => {
    [
      'o1',
      'o1-mini',
      'claude-3-5-sonnet',
      'claude-haiku-4',
      'claude-opus-4',
      'deepseek-chat',
      'deepseek-reasoner',
      'deepseek-coder'
    ].forEach((model) => expect(pricingFor(model, offPeak)).toBeNull())
  })
})

describe('DeepSeek pricing', () => {
  const offPeak = new Date('2026-10-14T12:00:00Z')
  const peak = new Date('2026-10-14T08:00:00Z') // Wednesday 08:00 UTC

  it.each([['deepseek-flash'], ['deepseek-v4-flash']])(
    'bills %s at the Flash price',
    (model) => {
      expect(pricingFor(model, offPeak)).toEqual({ input: 0.15, cachedInput: 0.003, output: 0.6 })
    }
  )

  it('doubles the price in peak hours', () => {
    expect(pricingFor('deepseek-flash', peak)).toEqual({ input: 0.3, cachedInput: 0.006, output: 1.2 })
  })

  it('costs twice as much for the same usage at peak', () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, totalTokens: 2_000_000, cachedInputTokens: 0 }

    expect(estimateCostUsd('deepseek-flash', usage, peak)).toBeCloseTo(
      2 * (estimateCostUsd('deepseek-flash', usage, offPeak) as number),
      10
    )
  })

  it.each([
    ['2026-10-14T00:59:59Z', false],
    ['2026-10-14T01:00:00Z', true],
    ['2026-10-14T03:59:59Z', true],
    ['2026-10-14T04:00:00Z', false],
    ['2026-10-14T05:59:59Z', false],
    ['2026-10-14T06:00:00Z', true],
    ['2026-10-14T09:59:59Z', true],
    ['2026-10-14T10:00:00Z', false],
    ['2026-10-17T08:00:00Z', false], // Saturday
    ['2026-10-18T08:00:00Z', false] // Sunday
  ])('peak check for %s is %s', (iso, expected) => {
    expect(isDeepSeekPeak(new Date(iso))).toBe(expected)
  })

  it('prices a run by when the request was received, not when it is stored', async () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000, cachedInputTokens: 0 }

    expect(estimateCostUsd('deepseek-flash', usage, peak)).toBeCloseTo(0.3, 10)
    expect(estimateCostUsd('deepseek-flash', usage, offPeak)).toBeCloseTo(0.15, 10)
  })
})
