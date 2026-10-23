import type { ChatTokenUsage } from '../chat/Chat.service'

/** USD per one million tokens. */
export interface ModelPricing {
  input: number
  cachedInput: number
  output: number
}

const TOKENS_PER_PRICE_UNIT = 1_000_000

/**
 * Standard list prices by model id, as published by each provider. A model whose
 * provider no longer lists a price (retired or renamed) is left out and reports no cost
 * rather than a guess. Models without a cache discount use their input price for cached input.
 */
const FLAT_PRICING: Readonly<Record<string, ModelPricing>> = {
  // OpenAI
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4-turbo': { input: 10, cachedInput: 10, output: 30 },
  'gpt-5.6-luna': { input: 0.2, cachedInput: 0.02, output: 1.2 },
  // Anthropic
  'claude-opus-5': { input: 5, cachedInput: 0.5, output: 25 },
  'claude-sonnet-5': { input: 2, cachedInput: 0.2, output: 10 },
  'claude-haiku-4-5': { input: 1, cachedInput: 0.1, output: 5 }
}

/**
 * DeepSeek's current model is `deepseek-flash`. The older `deepseek-v4-flash` name is still
 * accepted and billed at the same price (kept so earlier log rows still resolve).
 * Flash bills twice as much during its peak hours.
 */
const DEEPSEEK_FLASH_MODELS: ReadonlySet<string> = new Set(['deepseek-flash', 'deepseek-v4-flash'])
const DEEPSEEK_FLASH_OFF_PEAK: ModelPricing = { input: 0.15, cachedInput: 0.003, output: 0.6 }
const DEEPSEEK_FLASH_PEAK: ModelPricing = { input: 0.3, cachedInput: 0.006, output: 1.2 }
const DEEPSEEK_PEAK_UTC_HOURS: ReadonlyArray<readonly [start: number, end: number]> = [
  [1, 4],
  [6, 10]
]
const SATURDAY = 6
const SUNDAY = 0

/**
 * DeepSeek peak hours are 01:00-04:00 and 06:00-10:00 UTC on weekdays. Chinese public
 * holidays are off-peak but are not tracked, so those days are slightly overestimated.
 */
export function isDeepSeekPeak(at: Date): boolean {
  const day = at.getUTCDay()
  if (day === SATURDAY || day === SUNDAY) return false

  const hour = at.getUTCHours()
  return DEEPSEEK_PEAK_UTC_HOURS.some(([start, end]) => hour >= start && hour < end)
}

/** Price per million tokens in effect for this model at that moment, or null when unknown. */
export function pricingFor(model: string | undefined, at: Date): ModelPricing | null {
  if (model == null) return null
  if (DEEPSEEK_FLASH_MODELS.has(model)) {
    return isDeepSeekPeak(at) ? DEEPSEEK_FLASH_PEAK : DEEPSEEK_FLASH_OFF_PEAK
  }
  return FLAT_PRICING[model] ?? null
}

/** Model ids that have a published price (the DeepSeek Flash price varies by hour). */
export const PRICED_MODEL_IDS: readonly string[] = [
  ...Object.keys(FLAT_PRICING),
  ...DEEPSEEK_FLASH_MODELS
]

/** Estimated USD cost of one agent run, or null when the model's price or usage is unknown. */
export function estimateCostUsd(
  model: string | undefined,
  usage: ChatTokenUsage | undefined,
  at: Date = new Date()
): number | null {
  const pricing = pricingFor(model, at)
  if (pricing == null || usage == null) return null

  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens)
  const uncached = usage.inputTokens - cached

  return (
    (uncached * pricing.input +
      cached * pricing.cachedInput +
      usage.outputTokens * pricing.output) /
    TOKENS_PER_PRICE_UNIT
  )
}
