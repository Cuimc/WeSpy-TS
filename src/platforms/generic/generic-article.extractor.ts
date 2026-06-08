/**
 * 通用网页文章提取器
 */

import * as cheerio from 'cheerio'
import { HttpClient } from '../../fetcher/http-client.js'
import { htmlToMarkdown } from '../../converter/html-to-markdown.js'
import type { ArticleDraft, OutputFormat, OutputArtifact } from '../../core/types.js'
import type { Result } from '../../core/result.js'
import { ok, err } from '../../core/result.js'
import { fileSystemError } from '../../core/errors.js'
import { sanitizeFilename, formatLocalTime } from '../../utils/text.js'
import { writeFileSafe, writeJsonSafe, ensureDir } from '../../utils/fs.js'
import { join } from 'node:path'

/**
 * 从 HTML 中提取通用网页文章信息
 * 返回空字符串表示未找到对应字段，不注入假数据
 */
export function extractGenericInfo(html: string): {
  title: string
  author: string
  publishTime: string
  contentHtml: string
  contentText: string
} {
  const $ = cheerio.load(html)

  // 标题 - 尝试多种方式
  let title = ''
  const titleSources = [
    $('title').first(),
    $('h1').first(),
    $('h2').first(),
    $('meta[property="og:title"]').first(),
  ]
  for (const el of titleSources) {
    if (el.length) {
      title = el.attr('content') ?? el.text().trim()
      if (title) break
    }
  }

  // 作者（大小写不敏感匹配 class*="author"，与 Python re.I 一致）
  let author = ''
  const authorByClass = $('span, div').filter((_, el) => {
    const cls = $(el).attr('class') ?? ''
    return /author/i.test(cls)
  }).first()
  const authorSources = [
    $('meta[name="author"]').first(),
    authorByClass,
    $('#js_name').first(),
  ]
  for (const el of authorSources) {
    if (el.length) {
      author = el.attr('content') ?? el.text().trim()
      if (author) break
    }
  }

  // 发布时间
  let publishTime = ''
  const timeSources = [
    $('time').first(),
    $('span[class*="time"]').first(),
    $('span[class*="date"]').first(),
    $('meta[property="article:published_time"]').first(),
  ]
  for (const el of timeSources) {
    if (el.length) {
      publishTime = el.attr('content') ?? el.text().trim()
      if (publishTime) break
    }
  }

  // 内容区域
  const contentSelectors = [
    'article',
    '.article-content',
    '.content',
    '.post-content',
    '.entry-content',
    '#content',
    '.main-content',
    'main',
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentEl: cheerio.Cheerio<any> | null = null
  for (const selector of contentSelectors) {
    const el = $(selector).first()
    if (el.length) {
      contentEl = el
      break
    }
  }

  if (!contentEl) {
    contentEl = $('body').first()
  }

  const contentHtml = contentEl?.html() ?? ''
  const contentText = contentEl?.text().trim() ?? ''

  return { title, author, publishTime, contentHtml, contentText }
}

/**
 * 获取通用网页文章
 */
export async function fetchGenericArticle(
  url: string,
  httpClient: HttpClient,
  outputDir: string,
  formats: OutputFormat[],
): Promise<Result<{ article: ArticleDraft; artifacts: OutputArtifact[] }>> {
  const res = await httpClient.get(url)
  if (!res.ok) return err(res.error)

  const html = res.value.body
  const info = extractGenericInfo(html)

  // 通用网页不强制要求标题，但记录为 warning
  const warnings: string[] = []
  if (!info.title) warnings.push('未找到标题')
  if (!info.author) warnings.push('未找到作者信息')
  if (!info.publishTime) warnings.push('未找到发布时间')

  const article: ArticleDraft = {
    platform: 'generic',
    url,
    title: info.title || '(无标题)',
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
