import { StatusCodes } from 'http-status-codes'

import { createAgent } from 'langchain'
import { ChatService } from '../Chat.service'
import { ChatMemoryService } from '../ChatMemory.service'
import { pineconeService } from '../../rag'
import { TTSService } from '../TTS.service'
import { LLMModelService, LLMService } from '../../llm'
import { AppError } from '../../../utilities/AppError'

jest.mock('langchain', () => ({
  createAgent: jest.fn(() => ({
    invoke: jest.fn()
  }))
}))

jest.mock('../../llm', () => ({
  DEFAULT_OPENAI_MODEL: 'gpt-4o',
  LLMService: { create: jest.fn(() => ({ id: 'default-model' })) },
  LLMModelService: { getSelectedModel: jest.fn() }
}))

jest.mock('../TTS.service', () => ({
  TTSService: {
    synthesizeSpeech: jest.fn()
  }
}))

jest.mock('../../rag', () => ({
  pineconeService: {
    search: jest.fn()
  }
}))

jest.mock('../ChatMemory.service', () => ({
  ChatMemoryService: {
    getRecent: jest.fn(),
    appendTurn: jest.fn()
  }
}))

jest.mock('../../mcp/tools/index', () => ({
  deviceTools: []
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

const createAgentMock = createAgent as jest.Mock
const defaultInvoke = createAgentMock.mock.results[0].value.invoke as jest.Mock
const mockedPinecone = pineconeService as jest.Mocked<typeof pineconeService>
const mockedTTS = TTSService as jest.Mocked<typeof TTSService>
const mockedMemory = ChatMemoryService as jest.Mocked<typeof ChatMemoryService>
const mockedGetSelectedModel = LLMModelService.getSelectedModel as jest.Mock
const mockedLLMCreate = LLMService.create as jest.Mock
const builtAgents = (ChatService as unknown as { agentsByModel: Map<string, unknown> })
  .agentsByModel

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    builtAgents.clear()
    mockedGetSelectedModel.mockRejectedValue(new Error('no model selected'))
    mockedPinecone.search.mockResolvedValue([])
    mockedMemory.getRecent.mockResolvedValue([])
    mockedMemory.appendTurn.mockResolvedValue(undefined)
    defaultInvoke.mockResolvedValue({
      messages: [{ content: 'Lampu sudah dinyalakan.' }]
    })
  })

  it('returns text reply without audio by default', async () => {
    const result = await ChatService.query('Nyalakan lampu')

    expect(result).toEqual({ reply: 'Lampu sudah dinyalakan.' })
    expect(mockedTTS.synthesizeSpeech).not.toHaveBeenCalled()
    expect(mockedMemory.getRecent).not.toHaveBeenCalled()
    expect(mockedMemory.appendTurn).not.toHaveBeenCalled()
  })

  it('includes RAG context when pinecone returns hits', async () => {
    mockedPinecone.search.mockResolvedValue([{ content: 'Relay docs', source: 'manual' }])

    await ChatService.query('Bagaimana cara relay bekerja?')

    expect(defaultInvoke).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({
          role: 'human',
          content: expect.stringContaining('[Context from knowledge base]')
        })
      ]
    })
  })

  it('loads recent memory and persists the turn when scoped', async () => {
    mockedMemory.getRecent.mockResolvedValue([
      { role: 'user', content: 'Halo' },
      { role: 'assistant', content: 'Halo, ada yang bisa dibantu?' }
    ])

    await ChatService.query('Nyalakan lampu', {
      userId: 7,
      sessionId: 'web:7',
      source: 'web'
    })

    expect(mockedMemory.getRecent).toHaveBeenCalledWith({
      userId: 7,
      sessionId: 'web:7'
    })
    expect(defaultInvoke).toHaveBeenCalledWith({
      messages: [
        { role: 'human', content: 'Halo' },
        { role: 'assistant', content: 'Halo, ada yang bisa dibantu?' },
        { role: 'human', content: 'Nyalakan lampu' }
      ]
    })
    expect(mockedMemory.appendTurn).toHaveBeenCalledWith(
      { userId: 7, sessionId: 'web:7', source: 'web' },
      'Nyalakan lampu',
      'Lampu sudah dinyalakan.'
    )
  })

  it('returns reply with audio when withAudio is true', async () => {
    mockedTTS.synthesizeSpeech.mockResolvedValue({
      mimeType: 'audio/mpeg',
      base64: 'abc',
      byteLength: 3,
      speakText: 'Lampu sudah dinyalakan.'
    })

    const result = await ChatService.query('Nyalakan lampu', { withAudio: true })

    expect(result.reply).toBe('Lampu sudah dinyalakan.')
    expect(result.audio).toEqual({
      mimeType: 'audio/mpeg',
      base64: 'abc',
      byteLength: 3,
      speakText: 'Lampu sudah dinyalakan.'
    })
  })

  it('uses an override model agent when model is provided', async () => {
    const overrideInvoke = jest.fn().mockResolvedValue({
      messages: [{ content: 'Override reply' }]
    })
    createAgentMock.mockReturnValueOnce({ invoke: overrideInvoke })

    const overrideModel = { id: 'override' } as never
    const result = await ChatService.query('Nyalakan lampu', {
      model: overrideModel
    })

    expect(createAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: overrideModel })
    )
    expect(overrideInvoke).toHaveBeenCalled()
    expect(defaultInvoke).not.toHaveBeenCalled()
    expect(result.reply).toBe('Override reply')
  })

  it('returns tool-call trace when captureTrace is true', async () => {
    defaultInvoke.mockResolvedValue({
      messages: [
        {
          content: '',
          tool_calls: [
            {
              name: 'set_actuator_state_by_device_name',
              args: { deviceName: 'Smart Lamp Bedroom', state: 'on' },
              id: 'call-1'
            }
          ]
        },
        { content: 'Lampu sudah dinyalakan.' }
      ]
    })

    const result = await ChatService.query('Nyalakan lampu', {
      captureTrace: true
    })

    expect(result.reply).toBe('Lampu sudah dinyalakan.')
    expect(result.trace?.toolCalls).toEqual([
      {
        name: 'set_actuator_state_by_device_name',
        args: { deviceName: 'Smart Lamp Bedroom', state: 'on' },
        id: 'call-1'
      }
    ])
    expect(result.trace?.agentLatencyMs).toBeGreaterThanOrEqual(0)
    expect(result.trace?.contextLatencyMs).toBeGreaterThanOrEqual(0)
  })

  it('sums token usage across every AI message when captureTrace is true', async () => {
    defaultInvoke.mockResolvedValue({
      messages: [
        {
          content: '',
          tool_calls: [
            { name: 'set_actuator_state_by_device_name', args: {}, id: 'call-1' }
          ],
          usage_metadata: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
        },
        {
          content: 'Lampu sudah dinyalakan.',
          usage_metadata: { input_tokens: 130, output_tokens: 15, total_tokens: 145 }
        }
      ]
    })

    const result = await ChatService.query('Nyalakan lampu', { captureTrace: true })

    expect(result.trace?.tokenUsage).toEqual({
      inputTokens: 230,
      outputTokens: 35,
      totalTokens: 265,
      cachedInputTokens: 0
    })
  })

  it('omits tokenUsage when provider does not report usage_metadata', async () => {
    const result = await ChatService.query('Nyalakan lampu', { captureTrace: true })

    expect(result.trace?.tokenUsage).toBeUndefined()
  })

  it('counts cached input tokens so cost can use the cheaper rate', async () => {
    defaultInvoke.mockResolvedValue({
      messages: [
        {
          content: 'ok',
          usage_metadata: {
            input_tokens: 1000,
            output_tokens: 10,
            total_tokens: 1010,
            input_token_details: { cache_read: 400 }
          }
        }
      ]
    })

    const result = await ChatService.query('Halo', { captureTrace: true })

    expect(result.trace?.tokenUsage?.cachedInputTokens).toBe(400)
  })

  it('names the default model in the trace, and marks an override as custom', async () => {
    const overrideInvoke = jest.fn().mockResolvedValue({ messages: [{ content: 'ok' }] })
    createAgentMock.mockReturnValueOnce({ invoke: overrideInvoke })

    const byDefault = await ChatService.query('Halo', { captureTrace: true })
    const overridden = await ChatService.query('Halo', {
      captureTrace: true,
      model: { id: 'override' } as never
    })

    expect(byDefault.trace?.model).toBe('gpt-4o')
    expect(overridden.trace?.model).toBe('custom')
  })

  describe('model chosen in Settings', () => {
    const select = (id: string, provider: string) =>
      mockedGetSelectedModel.mockResolvedValue({ id, provider })
    const lastAgentInvoke = () =>
      createAgentMock.mock.results.at(-1)?.value.invoke as jest.Mock

    beforeEach(() => {
      createAgentMock.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({ messages: [{ content: 'ok' }] })
      }))
    })

    it('builds the agent from the selected model and answers with it', async () => {
      select('gpt-4o-mini', 'OpenAI')

      const result = await ChatService.query('Halo', { captureTrace: true })

      expect(mockedLLMCreate).toHaveBeenCalledWith({
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0
      })
      expect(defaultInvoke).not.toHaveBeenCalled()
      expect(lastAgentInvoke()).toHaveBeenCalled()
      expect(result.trace?.model).toBe('gpt-4o-mini')
    })

    it.each([
      ['DeepSeek', 'deepseek'],
      ['Anthropic', 'anthropic'],
      ['OpenAI', 'openai']
    ])('maps the %s provider name', async (label, provider) => {
      select('some-model', label)

      await ChatService.query('Halo')

      expect(mockedLLMCreate).toHaveBeenCalledWith(expect.objectContaining({ provider }))
    })

    it('builds each model once and reuses it', async () => {
      select('gpt-4o-mini', 'OpenAI')
      const before = createAgentMock.mock.calls.length

      await ChatService.query('Satu')
      await ChatService.query('Dua')

      expect(createAgentMock.mock.calls.length - before).toBe(1)
    })

    it('builds a separate agent when the selection changes', async () => {
      select('gpt-4o-mini', 'OpenAI')
      await ChatService.query('Satu')
      select('deepseek-chat', 'DeepSeek')

      const result = await ChatService.query('Dua', { captureTrace: true })

      expect(result.trace?.model).toBe('deepseek-chat')
      expect(mockedLLMCreate).toHaveBeenCalledTimes(2)
    })

    it('uses the built-in default agent when the selected model is the default', async () => {
      select('gpt-4o', 'OpenAI')
      const before = createAgentMock.mock.calls.length

      const result = await ChatService.query('Halo', { captureTrace: true })

      expect(createAgentMock.mock.calls.length).toBe(before)
      expect(defaultInvoke).toHaveBeenCalled()
      expect(result.trace?.model).toBe('gpt-4o')
    })

    it('falls back to the default when nothing is selected or the lookup fails', async () => {
      mockedGetSelectedModel.mockRejectedValue(AppError.notFound('Selected model not found'))

      const result = await ChatService.query('Halo', { captureTrace: true })

      expect(defaultInvoke).toHaveBeenCalled()
      expect(result.trace?.model).toBe('gpt-4o')
    })

    it('falls back to the default for a provider it does not know', async () => {
      select('mystery', 'Acme')

      const result = await ChatService.query('Halo', { captureTrace: true })

      expect(mockedLLMCreate).not.toHaveBeenCalled()
      expect(result.trace?.model).toBe('gpt-4o')
    })

    it('reports a missing API key instead of silently switching models', async () => {
      select('claude-opus-5', 'Anthropic')
      mockedLLMCreate.mockImplementationOnce(() => {
        throw new AppError('Anthropic API key is not configured', 500)
      })

      await expect(ChatService.query('Halo')).rejects.toMatchObject({
        message: 'Anthropic API key is not configured'
      })
    })

    it('still lets an evaluation override win over the Settings choice', async () => {
      select('gpt-4o-mini', 'OpenAI')

      const result = await ChatService.query('Halo', {
        captureTrace: true,
        model: { id: 'override' } as never
      })

      expect(mockedGetSelectedModel).not.toHaveBeenCalled()
      expect(result.trace?.model).toBe('custom')
    })
  })

  describe('extractToolResults', () => {
    const toolMessage = (name: string, content: unknown, extra: object = {}) => ({
      name,
      content,
      tool_call_id: `${name}-call`,
      ...extra
    })

    it('reports a tool that returned an error field as not ok', () => {
      const [result] = ChatService.extractToolResults([
        toolMessage(
          'set_actuator_state_by_device_name',
          '{"error":"Device not found","deviceName":"TV"}'
        )
      ])

      expect(result).toMatchObject({
        callId: 'set_actuator_state_by_device_name-call',
        name: 'set_actuator_state_by_device_name',
        ok: false,
        error: 'Device not found'
      })
    })

    it('reports a normal result as ok', () => {
      const [result] = ChatService.extractToolResults([
        toolMessage('list_devices', '{"items":[]}')
      ])

      expect(result).toMatchObject({ name: 'list_devices', ok: true })
      expect(result.error).toBeUndefined()
    })

    it('treats plain-text output as ok', () => {
      const [result] = ChatService.extractToolResults([toolMessage('list_devices', 'no devices')])

      expect(result.ok).toBe(true)
    })

    it('honours an errored status even without an error field', () => {
      const [result] = ChatService.extractToolResults([
        toolMessage('list_devices', 'Error: timeout', { status: 'error' })
      ])

      expect(result).toMatchObject({ ok: false, error: 'Error: timeout' })
    })

    it('ignores messages that are not tool outputs', () => {
      expect(
        ChatService.extractToolResults([{ content: 'Lampu menyala.' }, { content: '' }])
      ).toEqual([])
    })

    it('truncates long output for storage', () => {
      const [result] = ChatService.extractToolResults([
        toolMessage('list_devices', 'x'.repeat(5000))
      ])

      expect(result.output).toHaveLength(500)
    })

    it('is included in the trace', async () => {
      defaultInvoke.mockResolvedValue({
        messages: [
          toolMessage('set_actuator_state_by_device_name', '{"error":"Device not found"}'),
          { content: 'Maaf, TV tidak terdaftar.' }
        ]
      })

      const result = await ChatService.query('hidupkan TV', { captureTrace: true })

      expect(result.trace?.toolResults).toHaveLength(1)
      expect(result.trace?.toolResults[0].ok).toBe(false)
    })
  })

  it('wraps unexpected errors', async () => {
    defaultInvoke.mockRejectedValue(new Error('agent failed'))

    await expect(ChatService.query('Hello')).rejects.toMatchObject({
      message: 'Failed to process chat query with user message',
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR
    })
  })
})
