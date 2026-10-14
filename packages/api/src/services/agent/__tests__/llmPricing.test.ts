import { estimateCostUsd } from '../llmPricing'

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

  it.each([[undefined], ['custom'], ['deepseek-chat']])(
    'returns null when the model price is unknown (%p)',
    (model) => {
      expect(estimateCostUsd(model, usage(10, 10))).toBeNull()
    }
  )

  it('returns null when the provider reported no usage', () => {
    expect(estimateCostUsd('gpt-4o', undefined)).toBeNull()
  })
})
