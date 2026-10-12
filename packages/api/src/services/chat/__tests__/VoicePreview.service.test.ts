import axios from 'axios'
import { StatusCodes } from 'http-status-codes'
import { VoicePreviewService } from '../VoicePreview.service'

jest.mock('../../../configs/appConfig', () => ({
  appConfigs: { llm: { openAIApiKey: 'test-openai-key' } }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const sample = Buffer.from('mp3-bytes')

describe('VoicePreviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    VoicePreviewService.clearCache()
    mockedAxios.post.mockResolvedValue({ data: sample })
  })

  it('requests an Indonesian casual sample in the chosen voice', async () => {
    const audio = await VoicePreviewService.synthesize('cedar')

    expect(audio.equals(sample)).toBe(true)
    const [url, body, options] = mockedAxios.post.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/audio/speech')
    expect(body).toMatchObject({
      model: 'gpt-4o-mini-tts',
      voice: 'cedar',
      response_format: 'mp3'
    })
    expect(JSON.stringify(body)).toMatch(/santai/)
    expect((options as { headers: Record<string, string> }).headers.Authorization).toBe(
      'Bearer test-openai-key'
    )
  })

  it('reuses the cached sample for the same voice', async () => {
    await VoicePreviewService.synthesize('cedar')
    await VoicePreviewService.synthesize('cedar')

    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it('fetches again for a different voice', async () => {
    await VoicePreviewService.synthesize('cedar')
    await VoicePreviewService.synthesize('marin')

    expect(mockedAxios.post).toHaveBeenCalledTimes(2)
  })

  it('does not cache failures', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('network down'))

    await expect(VoicePreviewService.synthesize('cedar')).rejects.toMatchObject({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Failed to create voice preview'
    })
    await expect(VoicePreviewService.synthesize('cedar')).resolves.toBeDefined()
  })
})
