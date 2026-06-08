/**
 * WeSpy 核心类型定义
 */

import { z } from 'zod'

// ─── Platform ───────────────────────────────────────────────

export type SupportedPlatform =
  | 'wechat'
  | 'wechat-album'
  | 'juejin'
  | 'generic'

// ─── Output Format ──────────────────────────────────────────

export type OutputFormat = 'json' | 'markdown' | 'html'

// ─── Input Schemas (zod) ────────────────────────────────────

export const FetchArticleInputSchema = z.object({
  url: z.string().url('URL 格式无效'),
  outputDir: z.string().optional().default('articles'),
  format: z.array(z.enum(['json', 'markdown', 'html'])).optional().default(['markdown']),
  timeoutMs: z.number().int().positive().optional().default(30000),
  userAgent: z.string().optional(),
  headers: z.record(z.string()).optional(),
  downloadImages: z.boolean().optional(),
})

export type FetchArticleInput = z.input<typeof FetchArticleInputSchema>

export const FetchAlbumInputSchema = z.object({
  url: z.string().url('URL 格式无效'),
  outputDir: z.string().optional().default('articles'),
  format: z.array(z.enum(['json', 'markdown', 'html'])).optional().default(['markdown']),
  maxArticles: z.number().int().positive().optional().default(10),
  timeoutMs: z.number().int().positive().optional().default(30000),
  downloadImages: z.boolean().optional(),
})

export type FetchAlbumInput = z.input<typeof FetchAlbumInputSchema>

// ─── Article Data Model ─────────────────────────────────────

export interface ArticleImage {
  originalUrl: string
  localPath?: string
  alt?: string
  width?: number
  height?: number
}

export interface ArticleDraft {
  platform: SupportedPlatform
  url: string
  title: string
  author?: string
  publishTime?: string
  summary?: string
  /** 完整页面 HTML（与 Python 版 html_content 一致） */
  rawHtml?: string
  /** 内容区域 HTML */
  contentHtml?: string
  contentText?: string
  markdown?: string
  images?: ArticleImage[]
  metadata: Record<string, unknown>
  fetchedAt: string
  warnings: string[]
}

// ─── Output Artifact ────────────────────────────────────────

export interface OutputArtifact {
  type: 'json' | 'markdown' | 'html' | 'asset'
  path: string
}

// ─── Result Types ───────────────────────────────────────────

export interface FetchArticleSuccess {
  ok: true
  article: ArticleDraft
  artifacts: OutputArtifact[]
  warnings: string[]
}

export interface FetchArticleAlbumSuccess {
  ok: true
  articles: ArticleDraft[]
  artifacts: OutputArtifact[]
  warnings: string[]
  summaryFile?: string
  failedCount?: number
}

export interface FetchArticleFailure {
  ok: false
  error: WeSpyError
}

export type FetchArticleResult =
  | FetchArticleSuccess
  | FetchArticleAlbumSuccess
  | FetchArticleFailure

export interface FetchAlbumSuccess {
  ok: true
  articles: ArticleDraft[]
  artifacts: OutputArtifact[]
  warnings: string[]
  summaryFile?: string
  failedCount?: number
}

export interface FetchAlbumFailure {
  ok: false
  error: WeSpyError
}

export type FetchAlbumResult =
  | FetchAlbumSuccess
  | FetchAlbumFailure

// ─── Album List (仅获取列表，不下载文章) ─────────────────

export const FetchAlbumListInputSchema = z.object({
  url: z.string().url('URL 格式无效'),
  maxArticles: z.number().int().positive().optional().default(10),
  timeoutMs: z.number().int().positive().optional().default(30000),
})

export type FetchAlbumListInput = z.input<typeof FetchAlbumListInputSchema>

export interface FetchAlbumListSuccess {
  ok: true
  articles: AlbumArticleEntry[]
  warnings: string[]
}

export interface FetchAlbumListFailure {
  ok: false
  error: WeSpyError
}

export type FetchAlbumListResult =
  | FetchAlbumListSuccess
  | FetchAlbumListFailure

// ─── Album Article Entry (from API) ─────────────────────────

export interface AlbumArticleEntry {
  title: string
  url: string
  msgid: string
  createTime: string
  coverImg: string
  itemidx: string
  key: string
}

// ─── WeSpyError ─────────────────────────────────────────────

export interface WeSpyError {
  code:
    | 'INVALID_INPUT'
    | 'UNSUPPORTED_URL'
    | 'NETWORK_ERROR'
    | 'HTTP_STATUS_ERROR'
    | 'PARSE_EMPTY'
    | 'TIMEOUT'
    | 'FILE_SYSTEM_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}
