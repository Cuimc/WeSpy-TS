/**
 * HTTP 客户端封装
 * 基于 Node 内置 fetch（18+），支持 timeout、headers、user-agent、错误分类、编码检测
 */

import { networkError, httpStatusError, timeoutError } from '../core/errors.js'
import type { Result } from '../core/result.js'
import { ok, err } from '../core/result.js'

export interface HttpResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export interface HttpClientOptions {
  timeoutMs?: number
  userAgent?: string
  headers?: Record<string, string>
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

// 不设置 Accept-Encoding，让 fetch 自行管理压缩/解压
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

export class HttpClient {
  private readonly timeoutMs: number
  private readonly defaultHeaders: Record<string, string>

  constructor(options: HttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 30000
    this.defaultHeaders = {
      ...DEFAULT_HEADERS,
      'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
      ...options.headers,
    }
  }

  /**
   * 发起 GET 请求
   */
  async get(
    url: string,
    extraHeaders?: Record<string, string>,
  ): Promise<Result<HttpResponse>> {
    const headers = { ...this.defaultHeaders, ...extraHeaders }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      const statusCode = response.status

      if (statusCode >= 400) {
        return err(httpStatusError(statusCode, url))
      }

      // 将 fetch headers 转为 Record<string, string>
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value
      })

      // 检测编码并解码
      const body = await this.decodeBody(response, responseHeaders)

      return ok({ statusCode, headers: responseHeaders, body })
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === 'AbortError' || e.message.includes('abort')) {
          return err(timeoutError(url, this.timeoutMs))
        }
        if (e.name === 'TypeError' && e.message.includes('fetch')) {
          return err(networkError(e.message, { url, cause: e.message }))
        }
        return err(networkError(e.message, { url, cause: e.message }))
      }
      return err(networkError('Unknown network error', { url }))
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 解码响应体，处理编码检测
   * fetch 自动处理 gzip/brotli 解压，
   * 只在 Content-Type 指定了非 UTF-8 charset 时才手动重新解码。
   */
  private async decodeBody(
    response: globalThis.Response,
    headers: Record<string, string>,
  ): Promise<string> {
    // 1. 从 Content-Type header 提取 charset
    const contentType = headers['content-type'] ?? ''
    const charset = extractCharset(contentType)
    const encoding = normalizeEncoding(charset)

    // 2. 如果是 UTF-8 或没有指定 charset，直接用 .text()
    if (!encoding || encoding === 'utf-8') {
      return await response.text()
    }

    // 3. 非 UTF-8 charset：用 arrayBuffer + TextDecoder 手动解码
    try {
      const buffer = await response.arrayBuffer()
      const decoder = new TextDecoder(encoding)
      return decoder.decode(buffer)
    } catch {
      return await response.text()
    }
  }
}

/**
 * 从 Content-Type header 提取 charset
 * 例如: "text/html; charset=gb2312" → "gb2312"
 * 处理重复 header: "text/html; charset=UTF-8, text/html; charset=UTF-8"
 */
function extractCharset(contentType: string): string | null {
  // 取第一个 content-type 值（逗号分隔时）
  const firstPart = contentType.split(',')[0] ?? contentType
  const match = firstPart.match(/charset=([^\s;]+)/i)
  return match ? match[1]!.trim().toLowerCase() : null
}

/**
 * 标准化编码名称，映射常见别名
 */
function normalizeEncoding(charset: string | null): string | null {
  if (!charset) return null
  const map: Record<string, string> = {
    'gb2312': 'gbk',
    'gb18030': 'gbk',
    'gbk': 'gbk',
    'big5': 'big5',
    'euc-kr': 'euc-kr',
    'shift_jis': 'shift_jis',
    'iso-8859-1': 'windows-1252',
    'latin1': 'windows-1252',
    'utf-8': 'utf-8',
    'utf8': 'utf-8',
  }
  return map[charset] ?? charset
}
