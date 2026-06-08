/**
 * Juejin 文章提取器
 */

import * as cheerio from 'cheerio'
import { HttpClient } from '../../fetcher/http-client.js'
import { htmlToMarkdown } from '../../converter/html-to-markdown.js'
import { sanitizeHtml } from '../../converter/sanitize-html.js'
import type { ArticleDraft, OutputFormat, OutputArtifact } from '../../core/types.js'
import type { Result } from '../../core/result.js'
import { ok, err } from '../../core/result.js'
import { fileSystemError, parseEmptyError } from '../../core/errors.js'
import { sanitizeFilename, formatLocalTime } from '../../utils/text.js'
import { writeFileSafe, writeJsonSafe, ensureDir } from '../../utils/fs.js'
import type { JuejinArticleInfo } from './juejin.types.js'
import { join } from 'node:path'

const JUEJIN_HEADERS: Record<string, string> = {
  Referer: 'https://juejin.cn/',
}

/**
 * 从 HTML 中提取掘金文章信息
 * 返回空字符串表示未找到对应字段，不注入假数据
 */
export function extractJuejinInfo(html: string): JuejinArticleInfo {
  const $ = cheerio.load(html)

  // 标题
  const titleEl =
    $('h1.article-title').first().length ? $('h1.article-title').first()
    : $('h1.article-title-text').first().length ? $('h1.article-title-text').first()
    : $('h1').first()
  const title = titleEl.text().trim()

  // 作者
  const authorEl = $('span.name').first()
  const author = authorEl.text().trim()

  // 发布时间
  const timeEl =
    $('span.time').first().length ? $('span.time').first()
    : $('time').first().length ? $('time').first()
    : $('span.date').first()
  const publishTime = timeEl.text().trim()

  // 内容区域
  const contentEl =
    $('#article-root').first().length ? $('#article-root').first()
    : $('div.article-content').first().length ? $('div.article-content').first()
    : $('div.markdown-body').first().length ? $('div.markdown-body').first()
    : $('article').first().length ? $('article').first()
    : $('#article-content').first()

  let contentHtml = ''
  let contentText = ''

  if (contentEl.length) {
    // 清理内容
    const cleanedHtml = sanitizeHtml(contentEl.html() ?? '')
    const cleaned$ = cheerio.load(cleanedHtml)
    contentHtml = cleaned$.html() ?? ''
    contentText = cleaned$.text().trim()

    // Fallback: 如果清理后内容为空，尝试从 #article-root 重新清理
    if (!contentText) {
      const root$ = cheerio.load(html)
      const articleRoot = root$('#article-root').first()
      if (articleRoot.length) {
        const reCleaned = sanitizeHtml(articleRoot.html() ?? '')
        const reCleaned$ = cheerio.load(reCleaned)
        contentHtml = reCleaned$.html() ?? ''
        contentText = reCleaned$.text().trim()
      }
    }
  }

  // 标签（Python 语义: a.tag 优先，有结果则忽略 span.tag）
  const tags: string[] = []
  const aTags = $('a.tag')
  const tagEls = aTags.length > 0 ? aTags : $('span.tag')
  tagEls.each((_, el) => {
    const tag = $(el).text().trim()
    if (tag) tags.push(tag)
  })

  // 阅读数
  const viewEl =
    $('span.view-count').first().length ? $('span.view-count').first()
    : $('span.read-count').first()
  const viewCount = viewEl.text().trim()

  return { title, author, publishTime, contentHtml, contentText, tags, viewCount }
}

/**
 * 获取单篇掘金文章
 */
export async function fetchJuejinArticle(
  url: string,
  httpClient: HttpClient,
  outputDir: string,
  formats: OutputFormat[],
): Promise<Result<{ article: ArticleDraft; artifacts: OutputArtifact[] }>> {
  const res = await httpClient.get(url, JUEJIN_HEADERS)
  if (!res.ok) return err(res.error)

  const html = res.value.body
  const info = extractJuejinInfo(html)

  // 标题为空 → 解析失败
  if (!info.title) {
    return err(parseEmptyError(url))
  }

  // 记录缺失字段为 warnings
  const warnings: string[] = []
  if (!info.author) warnings.push('未找到作者信息')
  if (!info.publishTime) warnings.push('未找到发布时间')

  const metadata: Record<string, unknown> = {}
  if (info.tags.length) metadata.tags = info.tags
  if (info.viewCount) metadata.viewCount = info.viewCount

  const article: ArticleDraft = {
    platform: 'juejin',
    url,
    title: info.title,
    author: info.author || undefined,
    publishTime: info.publishTime || undefined,
    rawHtml: html,
    contentHtml: info.contentHtml,
    contentText: info.contentText,
    markdown: htmlToMarkdown(info.contentHtml),
    metadata,
    fetchedAt: formatLocalTime(),
    warnings,
  }

  let artifacts: OutputArtifact[]
  try {
    artifacts = await saveArtifacts(article, info, outputDir, formats)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return err(fileSystemError(message, { outputDir, url }))
  }

  return ok({ article, artifacts, warnings })
}

async function saveArtifacts(
  article: ArticleDraft,
  info: JuejinArticleInfo,
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
      tags: info.tags,
      view_count: info.viewCount || null,
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
    if (info.viewCount) lines.push(`**阅读量**: ${info.viewCount}`)
    if (info.tags.length) lines.push(`**标签**: ${info.tags.join(', ')}`)
    lines.push(`**原文链接**: ${article.url}`, '', '---', '', article.markdown)
    await writeFileSafe(filePath, lines.join('\n'))
    artifacts.push({ type: 'markdown', path: filePath })
  }

  return artifacts
}
