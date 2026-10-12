import { parseTelemetryMetrics, resolveMetricReading } from '../telemetryMetrics'

describe('parseTelemetryMetrics', () => {
  it('parses metric + value envelope', () => {
    expect(parseTelemetryMetrics({ metric: 'temperature', value: '28.5' })).toMatchObject(
      { temperature: 28.5, value: 28.5 }
    )
  })

  it('parses bare value as metrics.value', () => {
    expect(parseTelemetryMetrics({ value: '30' })).toEqual({ value: 30 })
  })

  it('parses multi-metric object', () => {
    expect(parseTelemetryMetrics({ temperature: 27, humidity: 60 })).toEqual({
      temperature: 27,
      humidity: 60
    })
  })

  it('parses JSON string inside value', () => {
    expect(parseTelemetryMetrics({ value: '{"temperature":22.1}' })).toMatchObject({
      temperature: 22.1
    })
  })
})

describe('parseTelemetryMetrics bare numbers', () => {
  it.each([['28', 28], [28, 28], ['-3.5', -3.5]])('parses %p as metrics.value', (input, n) => {
    expect(parseTelemetryMetrics(input)).toEqual({ value: n })
  })
})

describe('resolveMetricReading', () => {
  it('does not answer for a different metric when named metrics exist', () => {
    const metrics = parseTelemetryMetrics({ metric: 'temperature', value: 28 })
    expect(resolveMetricReading(metrics, 'humidity')).toBeNull()
    expect(resolveMetricReading({ temperature: 28, humidity: 60, value: 5 }, 'pressure')).toBeNull()
  })

  it('prefers named metric then falls back to value', () => {
    expect(resolveMetricReading({ temperature: 26, value: 1 }, 'temperature')).toBe(26)
    expect(resolveMetricReading({ value: 29 }, 'temperature')).toBe(29)
    expect(resolveMetricReading({ humidity: 40 }, 'temperature')).toBeNull()
  })
})
