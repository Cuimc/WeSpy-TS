/**
 * WeSpy 错误模型
 */

import type { WeSpyError } from './types.js'

export class WeSpyException extends Error {
  readonly wespyError: WeSpyError

  constructor(error: WeSpyError) {
    super(error.message)
    this.name = 'WeSpyException'
    this.wespyError = error
  }
}

export function createError(
  code: WeSpyError['code'],
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
): WeSpyError {
  return { code, message, retryable, details }
}

export function networkError(message: string, details?: Record<string, unknown>): WeSpyError {
  return createError('NETWORK_ERROR', message, true, details)
}

export function httpStatusError(statusCode: number, url: string): WeSpyError {
  return createError(
    'HTTP_STATUS_ERROR',
    `HTTP ${statusCode} for ${url}`,
    statusCode >= 500 || statusCode === 429,
    { statusCode, url },
  )
}

export function timeoutError(url: string, timeoutMs: number): WeSpyError {
  return createError('TIMEOUT', `Request timed out after ${timeoutMs}ms: ${url}`, true, { url, timeoutMs })
}

export function parseEmptyError(url: string): WeSpyError {
  return createError('PARSE_EMPTY', `Failed to extract article content from: ${url}`, false, { url })
}

export function unsupportedUrlError(url: string): WeSpyError {
  return createError('UNSUPPORTED_URL', `Unsupported URL: ${url}`, false, { url })
}

export function invalidInputError(message: string): WeSpyError {
  return createError('INVALID_INPUT', message, false)
}

export function fileSystemError(message: string, details?: Record<string, unknown>): WeSpyError {
  return createError('FILE_SYSTEM_ERROR', message, false, details)
}
