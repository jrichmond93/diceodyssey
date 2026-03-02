import type { VercelRequest } from '@vercel/node'

interface LogRecord {
  level: 'info' | 'warn' | 'error'
  traceId: string
  route: string
  method: string
  clientIp: string
  elapsedMs: number
  message: string
  [key: string]: unknown
}

const getHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (!value) {
    return undefined
  }

  return Array.isArray(value) ? value[0] : value
}

const getClientIp = (req: VercelRequest): string => {
  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for'])
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = getHeaderValue(req.headers['x-real-ip'])
  if (realIp) {
    return realIp
  }

  return 'unknown'
}

const writeLog = (record: LogRecord): void => {
  if (record.level === 'error') {
    console.error('API_LOG', record)
    return
  }

  if (record.level === 'warn') {
    console.warn('API_LOG', record)
    return
  }

  console.info('API_LOG', record)
}

export interface ApiRequestContext {
  traceId: string
  route: string
  method: string
  clientIp: string
  logInfo: (message: string, details?: Record<string, unknown>) => void
  logWarn: (message: string, details?: Record<string, unknown>) => void
  logError: (message: string, details?: Record<string, unknown>) => void
}

export const createApiRequestContext = (req: VercelRequest, route: string): ApiRequestContext => {
  const traceId = crypto.randomUUID()
  const startedAt = Date.now()
  const method = req.method ?? 'UNKNOWN'
  const clientIp = getClientIp(req)

  const buildRecord = (
    level: LogRecord['level'],
    message: string,
    details?: Record<string, unknown>,
  ): LogRecord => ({
    level,
    traceId,
    route,
    method,
    clientIp,
    elapsedMs: Date.now() - startedAt,
    message,
    ...(details ?? {}),
  })

  return {
    traceId,
    route,
    method,
    clientIp,
    logInfo: (message, details) => writeLog(buildRecord('info', message, details)),
    logWarn: (message, details) => writeLog(buildRecord('warn', message, details)),
    logError: (message, details) => writeLog(buildRecord('error', message, details)),
  }
}
