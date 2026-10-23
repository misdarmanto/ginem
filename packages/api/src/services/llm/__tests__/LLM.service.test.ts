import { ChatOpenAI } from '@langchain/openai'
import { ChatDeepSeek } from '@langchain/deepseek'
import { ChatAnthropic } from '@langchain/anthropic'
import { LLMService } from '../LLM.service'

jest.mock('../../../configs/appConfig', () => ({
  appConfigs: {
    llm: {
      openAIApiKey: 'test-openai-key',
      deepSeekApiKey: 'test-deepseek-key',
      anthropicApiKey: 'test-anthropic-key'
    }
  }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn()
}))

jest.mock('@langchain/deepseek', () => ({
  ChatDeepSeek: jest.fn()
}))

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn()
}))

const ChatOpenAIMock = jest.mocked(ChatOpenAI)
const ChatDeepSeekMock = jest.mocked(ChatDeepSeek)
const ChatAnthropicMock = jest.mocked(ChatAnthropic)

describe('LLMService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates ChatOpenAI with expected default config (no temperature override)', () => {
    LLMService.create()

    expect(ChatOpenAIMock).toHaveBeenCalledWith({
      model: 'gpt-4o',
      temperature: undefined,
      maxTokens: 500,
      apiKey: 'test-openai-key',
      reasoning: { effort: 'none' }
    })
  })

  it.each([['gpt-4o'], ['gpt-4o-mini'], ['gpt-5.6-luna'], ['gpt-4-turbo']])(
    'turns reasoning off for %s so tool calling keeps working',
    (model) => {
      LLMService.create({ provider: 'openai', model })

      expect(ChatOpenAIMock).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: { effort: 'none' } })
      )
    }
  )

  it.each([['o1'], ['o3'], ['o4-mini']])(
    'uses the lowest effort the o-series accepts for %s, which rejects "none"',
    (model) => {
      LLMService.create({ provider: 'openai', model })

      expect(ChatOpenAIMock).toHaveBeenCalledWith(
        expect.objectContaining({ model, reasoning: { effort: 'low' } })
      )
    }
  )

  it('leaves temperature out for o-series models, which reject it', () => {
    LLMService.create({ provider: 'openai', model: 'o1', temperature: 0 })

    expect(ChatOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'o1', temperature: undefined })
    )
  })

  it('keeps the requested temperature for other OpenAI models', () => {
    LLMService.create({ provider: 'openai', model: 'gpt-4o-mini', temperature: 0 })

    expect(ChatOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', temperature: 0 })
    )
  })

  it('creates ChatOpenAI with overrides', () => {
    LLMService.create({
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 200
    })

    expect(ChatOpenAIMock).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 200,
      apiKey: 'test-openai-key',
      reasoning: { effort: 'none' }
    })
  })

  it('creates ChatDeepSeek when provider is deepseek (no temperature override)', () => {
    LLMService.create({ provider: 'deepseek', model: 'deepseek-chat' })

    expect(ChatDeepSeekMock).toHaveBeenCalledWith({
      model: 'deepseek-chat',
      temperature: undefined,
      maxTokens: 500,
      apiKey: 'test-deepseek-key'
    })
  })

  it('creates ChatOpenAI with an explicit temperature when the caller asks for one (production default agent)', () => {
    LLMService.create({ temperature: 0 })

    expect(ChatOpenAIMock).toHaveBeenCalledWith({
      model: 'gpt-4o',
      temperature: 0,
      maxTokens: 500,
      apiKey: 'test-openai-key',
      reasoning: { effort: 'none' }
    })
  })

  it('creates ChatAnthropic with expected default config', () => {
    LLMService.create({ provider: 'anthropic' })

    expect(ChatAnthropicMock).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-5',
      maxTokens: 500,
      apiKey: 'test-anthropic-key'
    })
  })

  it('creates ChatAnthropic with overrides', () => {
    LLMService.create({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.2,
      maxTokens: 1024
    })

    expect(ChatAnthropicMock).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 1024,
      apiKey: 'test-anthropic-key'
    })
  })
})
