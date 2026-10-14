import type { ChatTokenUsage } from '../chat/Chat.service'

/** USD per one million tokens. */
interface ModelPricing {
  input: number
  cachedInput: number
  output: number
}

const TOKENS_PER_PRICE_UNIT = 1_000_000

/** OpenAI standard-tier list prices. Models missing here are reported without a cost. */
export const LLM_PRICING: Readonly<Record<string, ModelPricing>> = {
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 }
}

/** Estimated USD cost of one agent run, or null when the model's price is unknown. */
export function estimateCostUsd(
  model: string | undefined,
  usage: ChatTokenUsage | undefined
): number | null {
  if (model == null || usage == null) return null
  const pricing = LLM_PRICING[model]
  if (pricing == null) return null

  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens)
  const uncached = usage.inputTokens - cached

  return (
    (uncached * pricing.input +
      cached * pricing.cachedInput +
      usage.outputTokens * pricing.output) /
    TOKENS_PER_PRICE_UNIT
  )
}
