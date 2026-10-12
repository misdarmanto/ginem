import axios from 'axios'
import { StatusCodes } from 'http-status-codes'
import {
  VOICE_TOOL_NAME,
  VoiceSessionService,
  buildVoiceSessionConfig
} from '../VoiceSession.service'

jest.mock('../../../configs/appConfig', () => ({
  appConfigs: {
    llm: { openAIApiKey: 'test-openai-key' },
    realtime: { model: 'gpt-realtime-2.1-mini', voice: 'marin' }
  }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

interface BuiltConfig {
  expires_after: { seconds: number }
  session: {
    type: string
    model: string
    instructions: string
    tools: Array<Record<string, unknown>>
    audio: {
      input: { turn_detection: Record<string, unknown> }
      output: { voice: string }
    }
  }
}

describe('buildVoiceSessionConfig', () => {
  const { session, expires_after: expiresAfter } =
    buildVoiceSessionConfig() as unknown as BuiltConfig

  it('uses the configured model and voice', () => {
    expect(session.type).toBe('realtime')
    expect(session.model).toBe('gpt-realtime-2.1-mini')
    expect(session.audio.output.voice).toBe('marin')
  })

  it('tells the model to use the tool and keep a casual, short tone', () => {
    expect(session.instructions).toContain(VOICE_TOOL_NAME)
    expect(session.instructions).toMatch(/percakapan sehari-hari/)
    expect(session.instructions).toMatch(/singkat/)
  })

  it('exposes only the ask_assistant function tool with a required query', () => {
    expect(session.tools).toHaveLength(1)
    expect(session.tools[0]).toMatchObject({
      type: 'function',
      name: VOICE_TOOL_NAME,
      parameters: { required: ['query'] }
    })
  })

  it('enables semantic VAD with barge-in', () => {
    expect(session.audio.input.turn_detection).toMatchObject({
      type: 'semantic_vad',
      interrupt_response: true,
      create_response: true
    })
  })

  it('keeps the client secret short-lived', () => {
    expect(expiresAfter.seconds).toBeLessThanOrEqual(300)
  })
})

describe('VoiceSessionService.createClientSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the ephemeral key and never exposes the server API key', async () => {
    mockedAxios.post.mockResolvedValue({ data: { value: 'ek_test', expires_at: 1900000000 } })

    const result = await VoiceSessionService.createClientSecret(7)

    expect(result).toEqual({
      clientSecret: 'ek_test',
      expiresAt: 1900000000,
      model: 'gpt-realtime-2.1-mini'
    })
    expect(JSON.stringify(result)).not.toContain('test-openai-key')
  })

  it('authenticates with the server key and sends a hashed safety identifier', async () => {
    mockedAxios.post.mockResolvedValue({ data: { value: 'ek_test', expires_at: 1 } })

    await VoiceSessionService.createClientSecret(7)

    const [url, , options] = mockedAxios.post.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/realtime/client_secrets')
    const headers = (options as { headers: Record<string, string> }).headers
    expect(headers.Authorization).toBe('Bearer test-openai-key')
    expect(headers['OpenAI-Safety-Identifier']).toMatch(/^[a-f0-9]{64}$/)
    expect(headers['OpenAI-Safety-Identifier']).not.toBe('7')
  })

  it('rejects an upstream response without a secret', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} })

    await expect(VoiceSessionService.createClientSecret()).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_GATEWAY
    })
  })

  it('wraps upstream failures as a generic 500', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network down'))

    await expect(VoiceSessionService.createClientSecret()).rejects.toMatchObject({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Failed to create voice session'
    })
  })
})
