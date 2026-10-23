import { LLMService } from '../llm'
import logger from '../../utilities/logger'
import type { AgentOutcome, ResolvedAgentStatus } from './agentOutcome'

const JUDGE_MODEL = 'gpt-4o-mini'
const JUDGE_MAX_TOKENS = 150
const REASON_MAX_CHARS = 200
const VALID_STATUSES: readonly ResolvedAgentStatus[] = ['success', 'failed', 'clarification']

const JUDGE_PROMPT = `You label the outcome of one command given to a smart-home assistant.
Reply with JSON only: {"status":"success|failed|clarification","reason":"<one short sentence in Indonesian>"}.
- success: the request was fulfilled, or the question was answered with real information.
- failed: it could not be done, e.g. the device is not registered, is not supported, errored, or the assistant refused.
- clarification: the assistant could not act because the command is ambiguous or incomplete and it asks the user for more detail.`

export interface JudgeInput {
  command: string
  reply: string
  toolNames: readonly string[]
}

function parseOutcome(raw: string): AgentOutcome | null {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0]
  if (jsonText == null) return null

  try {
    const parsed = JSON.parse(jsonText) as { status?: unknown; reason?: unknown }
    const status = VALID_STATUSES.find((candidate) => candidate === parsed.status)
    if (status == null) return null

    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''
    return { status, reason: reason.slice(0, REASON_MAX_CHARS) }
  } catch {
    return null
  }
}

export class AgentOutcomeJudgeService {
  /** Asks a small model to label the outcome. Returns null when it cannot be decided. */
  static async judge(input: JudgeInput): Promise<AgentOutcome | null> {
    try {
      const model = LLMService.create({
        provider: 'openai',
        model: JUDGE_MODEL,
        temperature: 0,
        maxTokens: JUDGE_MAX_TOKENS
      })
      const response = await model.invoke([
        { role: 'system', content: JUDGE_PROMPT },
        {
          role: 'user',
          content: `Command: ${input.command}\nTools used: ${input.toolNames.join(', ') || 'none'}\nAssistant reply: ${input.reply}`
        }
      ])

      const content = response.content
      return parseOutcome(typeof content === 'string' ? content : JSON.stringify(content))
    } catch (judgeError) {
      logger.warn(`[AgentOutcomeJudge] judge failed: ${String(judgeError)}`)
      return null
    }
  }
}
