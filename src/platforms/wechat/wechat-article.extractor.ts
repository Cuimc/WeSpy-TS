/**
 * WeChat 文章提取器
 */

import * as cheerio from 'cheerio'
import { HttpClient } from '../../fetcher/http-client.js'
import { htmlToMarkdown } from '../../converter/html-to-markdown.js'
import type { ArticleDraft, OutputFormat, OutputArtifact } from '../../core/types.js'
import type { Result } from '../../core/result.js'
import { ok, err } from '../../core/result.js'
import { fileSystemError, parseEmptyError } from '../../core/errors.js'
import { sanitizeFilename, formatLocalTime } from '../../utils/text.js'
import { writeFileSafe, writeJsonSafe, ensureDir } from '../../utils/fs.js'
import type { WechatArticleInfo } from './wechat.types.js'
import { join } from 'node:path'

const WECHAT_HEADERS: Record<string, string> = {
  Referer: 'https://mp.weixin.qq.com/',
}

/**
 * 从 HTML 中提取微信文章信息
 * 返回空字符串表示未找到对应字段，不注入假数据
 */
export function extractWechatInfo(html: string): WechatArticleInfo {
  const $ = cheerio.load(html)

  // 标题
  const titleEl = $('h1.rich_media_title').first().length
    ? $('h1.rich_media_title').first()
    : $('h1').first()
  const title = titleEl.text().trim()

  // 作者
  const authorEl =
    $('#js_name').first().length ? $('#js_name').first()
    : $('a.profile_nickname').first().length ? $('a.profile_nickname').first()
    : $('span.profile_nickname').first()
  const author = authorEl.text().trim().replace(/[\n\r\t]/g, '')

  // 发布时间
  let publishTime = ''
  const timeEl = $('#publish_time').first().length
    ? $('#publish_time').first()
    : $('span.publish_time').first()
  if (timeEl.length) {
    publishTime = timeEl.text().trim()
  }
  // JS 渲染的时间 fallback
  if (!publishTime) {
    const match = html.match(/create_time:\s*JsDecode\('([^']+)'\)/)
    if (match) publishTime = match[1]!
  }

  // 内容
  const contentEl = $('#js_content')
  const contentHtml = contentEl.length ? (contentEl.html() ?? '') : ''
  const contentText = contentEl.length ? contentEl.text().trim() : ''

  return { title, author, publishTime, contentHtml, contentText }
}

/**
 * 获取单篇微信文章
 */
export async function fetchWechatArticle(
  url: string,
  httpClient: HttpClient,
  outputDir: string,
  formats: OutputFormat[],
): Promise<Result<{ article: ArticleDraft; artifacts: OutputArtifact[] }>> {
  const res = await httpClient.get(url, WECHAT_HEADERS)
  if (!res.ok) return err(res.error)

  const html = res.value.body
  const info = extractWechatInfo(html)

  // 标题为空 → 解析失败
  if (!info.title) {
    return err(parseEmptyError(url))
  }

  // 记录缺失字段为 warnings，不注入假数据
  const warnings: string[] = []
  if (!info.author) warnings.push('未找到作者信息')
  if (!info.publishTime) warnings.push('未找到发布时间')

  const article: ArticleDraft = {
    platform: 'wechat',
    url,
    title: info.title,
    author: info.author || undefined,
    publishTime: info.publishTime || undefined,
    rawHtml: html,
    contentHtml: info.contentHtml,
    contentText: info.contentText,
    markdown: htmlToMarkdown(info.contentHtml),
    metadata: {},
    fetchedAt: formatLocalTime(),
    warnings,
  }

  let artifacts: OutputArtifact[]
  try {
    artifacts = await saveArtifacts(article, outputDir, formats)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return err(fileSystemError(message, { outputDir, url }))
  }

  return ok({ article, artifacts, warnings })
}

async function saveArtifacts(
  article: ArticleDraft,
  outputDir: string,
  formats: OutputFormat[],
): Promise<OutputArtifact[]> {
  const artifacts: OutputArtifact[] = []
  const safeTitle = sanitizeFilename(article.title)
  const timestamp = Math.floor(Date.now() / 1000)
  await ensureDir(outputDir)

  // HTML 文件保存完整页面（与 Python 版一致）
  const htmlFileName = formats.includes('html') && article.rawHtml
    ? `${safeTitle}_${timestamp}.html`
    : null

  if (htmlFileName && article.rawHtml) {
    const filePath = join(outputDir, htmlFileName)
    await writeFileSafe(filePath, article.rawHtml)
    artifacts.push({ type: 'html', path: filePath })
  }

  if (formats.includes('json')) {
    const filePath = join(outputDir, `${safeTitle}_${timestamp}_info.json`)
    await writeJsonSafe(filePath, {
      title: article.title,
      author: article.author ?? null,
      publish_time: article.publishTime ?? null,
      url: article.url,
      html_file: htmlFileName,
      fetch_time: article.fetchedAt,
    })
    artifacts.push({ type: 'json', path: filePath })
  }

  if (formats.includes('markdown') && article.markdown) {
    const filePath = join(outputDir, `${safeTitle}_${timestamp}.md`)
    const lines = [`# ${article.title}`, '']
    if (article.author) lines.push(`**作者**: ${article.author}`)
    if (article.publishTime) lines.push(`**发布时间**: ${article.publishTime}`)
    lines.push(`**原文链接**: ${article.url}`, '', '---', '', article.markdown)
    await writeFileSafe(filePath, lines.join('\n'))
    artifacts.push({ type: 'markdown', path: filePath })
  }

  return artifacts
}
