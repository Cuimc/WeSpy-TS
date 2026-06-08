/**
 * Result 类型 —— 避免 throw，用类型安全的方式传递错误
 */

import type { WeSpyError } from './types.js'

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: WeSpyError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T>(error: WeSpyError): Result<T> {
  return { ok: false, error }
}

export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok
}

export function isErr<T>(result: Result<T>): result is { ok: false; error: WeSpyError } {
  return !result.ok
}

/** 将 Result 转为值或抛出异常 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value
  throw new Error(result.error.message)
}

/** 将 Result 转为值或返回默认值 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue
}
