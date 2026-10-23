import { StatusCodes } from 'http-status-codes'
import { AppError } from '../AppError'
import { handleError, handleServerError } from '../requestHandler'

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => logger.error(...args),
    warn: (...args: unknown[]) => logger.warn(...args),
    info: (...args: unknown[]) => logger.info(...args)
  }
}))

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    }
  }
  return res
}

describe('request error handling and what reaches the Logger page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('records an unexpected exception as an error with its stack and source', () => {
    const res = fakeRes()
    const error = new Error('db exploded')

    handleServerError(res as never, error)

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(logger.error).toHaveBeenCalledWith('Unable to process request!: db exploded', {
      stack: error.stack,
      source: 'handleServerError'
    })
  })

  it('records a thrown non-Error value too', () => {
    const res = fakeRes()

    handleServerError(res as never, 'a string was thrown')

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(logger.error).toHaveBeenCalledWith('Unable to process request! Unknown error', {
      source: 'handleServerError'
    })
  })

  it('does not hand the caller the internal error text', () => {
    const res = fakeRes()

    handleServerError(res as never, new Error('secret detail'))

    expect(JSON.stringify(res.body)).not.toContain('secret detail')
  })

  it.each([
    [StatusCodes.BAD_REQUEST],
    [StatusCodes.UNAUTHORIZED],
    [StatusCodes.NOT_FOUND]
  ])('keeps a %i client error out of the Logger page', (status) => {
    const res = fakeRes()

    handleError(res as never, new AppError('Invalid credentials', status))

    expect(res.statusCode).toBe(status)
    expect(logger.warn).toHaveBeenCalledWith(`[AppError] ${status}: Invalid credentials`, {
      persist: false
    })
  })

  it('records a 5xx AppError, because that is a server problem', () => {
    const res = fakeRes()

    handleError(res as never, new AppError('Failed to create rule', StatusCodes.INTERNAL_SERVER_ERROR))

    const [message, meta] = logger.warn.mock.calls[0]
    expect(message).toBe('[AppError] 500: Failed to create rule')
    expect(meta).not.toHaveProperty('persist', false)
  })

  it('treats an unknown error as a server error', () => {
    const res = fakeRes()

    handleError(res as never, new Error('boom'))

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(logger.error).toHaveBeenCalled()
  })
})
