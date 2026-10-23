import { AgentOutcomeJudgeService } from '../AgentOutcomeJudge.service'

const invoke = jest.fn()

jest.mock('../../llm', () => ({
  LLMService: { create: jest.fn(() => ({ invoke })) }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

const { LLMService } = jest.requireMock('../../llm')

const input = { command: 'hidupkan TV', reply: 'TV tidak terdaftar.', toolNames: [] }

describe('AgentOutcomeJudgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the labelled outcome', async () => {
    invoke.mockResolvedValue({ content: '{"status":"failed","reason":"TV is not registered"}' })

    expect(await AgentOutcomeJudgeService.judge(input)).toEqual({
      status: 'failed',
      reason: 'TV is not registered'
    })
  })

  it('accepts JSON wrapped in prose or a code fence', async () => {
    invoke.mockResolvedValue({
      content: 'Here you go:\n```json\n{"status":"clarification","reason":"which lamp?"}\n```'
    })

    expect(await AgentOutcomeJudgeService.judge(input)).toMatchObject({
      status: 'clarification'
    })
  })

  it('uses a small, deterministic model', async () => {
    invoke.mockResolvedValue({ content: '{"status":"success","reason":"ok"}' })

    await AgentOutcomeJudgeService.judge(input)

    expect(LLMService.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', temperature: 0 })
    )
  })

  it('sends the command, tools and reply to the model', async () => {
    invoke.mockResolvedValue({ content: '{"status":"success","reason":"ok"}' })

    await AgentOutcomeJudgeService.judge({ ...input, toolNames: ['list_devices'] })

    const [messages] = invoke.mock.calls[0] as [Array<{ content: string }>]
    expect(messages[1].content).toContain('hidupkan TV')
    expect(messages[1].content).toContain('list_devices')
    expect(messages[1].content).toContain('TV tidak terdaftar.')
  })

  it.each([
    ['unknown status', '{"status":"maybe","reason":"?"}'],
    ['no JSON', 'I think it worked'],
    ['broken JSON', '{"status": "success"']
  ])('returns null for %s', async (_label, content) => {
    invoke.mockResolvedValue({ content })

    expect(await AgentOutcomeJudgeService.judge(input)).toBeNull()
  })

  it('returns null instead of throwing when the model call fails', async () => {
    invoke.mockRejectedValue(new Error('rate limited'))

    expect(await AgentOutcomeJudgeService.judge(input)).toBeNull()
  })
})
