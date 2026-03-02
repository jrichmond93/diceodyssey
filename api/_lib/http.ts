export type ApiResponseBody = Record<string, unknown>

export const sendJson = (
  res: { status: (code: number) => { json: (body: ApiResponseBody) => void } },
  statusCode: number,
  body: ApiResponseBody,
): void => {
  res.status(statusCode).json(body)
}

export const readJsonBody = async <T>(req: { body?: unknown }): Promise<T> => {
  if (req.body && typeof req.body === 'object') {
    return req.body as T
  }

  return {} as T
}

export const methodNotAllowed = (
  req: { method?: string },
  res: { status: (code: number) => { json: (body: ApiResponseBody) => void } },
): void => {
  sendJson(res, 405, {
    error: 'METHOD_NOT_ALLOWED',
    method: req.method ?? 'UNKNOWN',
  })
}
