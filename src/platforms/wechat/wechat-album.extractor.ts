/**
 * WeChat 专辑提取器
 */

import { HttpClient } from '../../fetcher/http-client.js'
import type { AlbumArticleEntry, ArticleDraft, OutputFormat, OutputArtifact } from '../../core/types.js'
import type { Result } from '../../core/result.js'
import { ok, err } from '../../core/result.js'
import { fileSystemError, networkError } from '../../core/errors.js'
import type { WechatAlbumInfo } from './wechat.types.js'
import { stripHashSuffix } from '../../utils/url.js'
import { fetchWechatArticle } from './wechat-article.extractor.js'
import { writeJsonSafe } from '../../utils/fs.js'
import { formatLocalTime } from '../../utils/text.js'
import { join } from 'node:path'

const WECHAT_MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.5'

/**
 * 解析专辑 URL 参数
 */
export function parseAlbumInfo(albumUrl: string): WechatAlbumInfo | null {
  try {
    const parsed = new URL(albumUrl)
    const params = parsed.searchParams

    const biz = params.get('__biz') || ''
    const action = params.get('action') || ''
    const albumId = params.get('album_id') || ''

    if (!biz || !action || !albumId) return null

    return { biz, action, albumId, originalUrl: albumUrl }
  } catch {
    return null
  }
}

/**
 * 获取专辑中的文章列表（分页）
 */
export async function fetchAlbumArticleList(
  albumUrl: string,
  httpClient: HttpClient,
  maxArticles?: number,
): Promise<Result<AlbumArticleEntry[]>> {
  const albumInfo = parseAlbumInfo(albumUrl)
  if (!albumInfo) {
    return err(networkError('无法解析专辑 URL', { url: albumUrl }))
  }

  const articles: AlbumArticleEntry[] = []
  let beginMsgid = 0
  let beginItemidx = 0
  const count = 10

  while (true) {
    const apiUrl = new URL('https://mp.weixin.qq.com/mp/appmsgalbum')
    apiUrl.searchParams.set('action', 'getalbum')
    apiUrl.searchParams.set('__biz', albumInfo.biz)
    apiUrl.searchParams.set('album_id', albumInfo.albumId)
    apiUrl.searchParams.set('count', String(count))
    apiUrl.searchParams.set('begin_msgid', String(beginMsgid))
    apiUrl.searchParams.set('begin_itemidx', String(beginItemidx))
    apiUrl.searchParams.set('f', 'json')

    const res = await httpClient.get(apiUrl.toString(), {
      'User-Agent': WECHAT_MOBILE_UA,
      Referer: 'https://mp.weixin.qq.com/',
    })
    if (!res.ok) {
      // 如果已经获取到部分文章，返回成功
      if (articles.length > 0) break
      return err(res.error)
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(res.value.body) as Record<string, unknown>
    } catch {
      if (articles.length > 0) break
      return err(networkError('专辑 API 响应不是有效 JSON', { url: albumUrl }))
    }

    const baseResp = data['base_resp'] as Record<string, unknown> | undefined
    if (baseResp && baseResp['ret'] !== 0) {
      if (articles.length > 0) break
      return err(networkError(`专辑 API 返回错误: ${JSON.stringify(baseResp)}`, { url: albumUrl }))
    }

    const albumResp = data['getalbum_resp'] as Record<string, unknown> | undefined
    const articleList = (albumResp?.['article_list'] ?? []) as Array<Record<string, unknown>>

    if (!articleList.length) break

    for (const item of articleList) {
      const title = String(item['title'] ?? '').trim()
      const url = stripHashSuffix(String(item['url'] ?? '')).trim()

      // 关键字段为空则跳过该条目
      if (!title || !url) continue

      const entry: AlbumArticleEntry = {
        title,
        url,
        msgid: String(item['msgid'] ?? ''),
        createTime: String(item['create_time'] ?? ''),
        coverImg: String(item['cover_img_1_1'] ?? ''),
        itemidx: String(item['itemidx'] ?? ''),
        key: String(item['key'] ?? ''),
      }
      articles.push(entry)

      if (maxArticles && articles.length >= maxArticles) {
        return ok(articles)
      }
    }

    // 检查是否还有更多
    if (!albumResp) break
    const continueFlag = String(albumResp['continue_flag'] ?? '0')
    if (continueFlag !== '1') break

    // 更新分页游标 — 缺失则终止（避免死循环）
    const last = articleList[articleList.length - 1]!
    const lastMsgid = last['msgid']
    const lastItemidx = last['itemidx']
    if (lastMsgid == null || lastItemidx == null) break
    beginMsgid = Number(lastMsgid)
    beginItemidx = Number(lastItemidx)

    // 延迟
    await delay(500)
  }

  return ok(articles)
}

/**
 * 批量下载专辑文章
 */
export async function fetchAlbumArticles(
  albumUrl: string,
  httpClient: HttpClient,
  outputDir: string,
  formats: OutputFormat[],
  maxArticles?: number,
): Promise<Result<{ articles: ArticleDraft[]; artifacts: OutputArtifact[]; summaryFile?: string; failedCount?: number }>> {
  const listResult = await fetchAlbumArticleList(albumUrl, httpClient, maxArticles)
  if (!listResult.ok) return err(listResult.error)

  const entries = listResult.value
  if (!entries.length) {
    // Python: 返回空列表（成功），不是错误
    return ok({ articles: [], artifacts: [], failedCount: 0 })
  }

  const albumName = `album_${Math.floor(Date.now() / 1000)}`
  const albumDir = join(outputDir, albumName)

  const articles: ArticleDraft[] = []
  const allArtifacts: OutputArtifact[] = []
  const failed: Array<{ title: string; url: string; msgid: string; error: string }> = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    console.log(`\n[${i + 1}/${entries.length}] 正在下载: ${entry.title}`)

    const articleResult = await fetchWechatArticle(entry.url, httpClient, albumDir, formats)

    if (articleResult.ok) {
      // 合并专辑元数据到文章（与 Python 版一致）
      const article = articleResult.value.article
      article.metadata['album_title'] = entry.title
      article.metadata['album_url'] = albumUrl
      article.metadata['msgid'] = entry.msgid
      article.metadata['create_time'] = entry.createTime
      article.metadata['cover_img'] = entry.coverImg
      articles.push(article)
      allArtifacts.push(...articleResult.value.artifacts)
      console.log(`✅ 下载成功`)
    } else {
      failed.push({ title: entry.title, url: entry.url, msgid: entry.msgid, error: articleResult.error.message })
      console.log(`❌ 下载失败: ${articleResult.error.message}`)
    }

    // 延迟
    if (i < entries.length - 1) await delay(1000)
  }

  // 保存汇总（与 Python 版字段一致）
  const summaryFile = join(outputDir, `${albumName}_summary.json`)
  try {
    await writeJsonSafe(summaryFile, {
      album_url: albumUrl,
      download_time: formatLocalTime(),
      statistics: {
        total_count: entries.length,
        successful_count: articles.length,
        failed_count: failed.length,
      },
      successful_articles: articles.map((a) => ({
        title: a.title,
        author: a.author,
        url: a.url,
        msgid: String(a.metadata['msgid'] ?? ''),
        create_time: String(a.metadata['create_time'] ?? ''),
      })),
      failed_articles: failed,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return err(fileSystemError(message, { outputDir, albumUrl }))
  }

  return ok({ articles, artifacts: allArtifacts, summaryFile, failedCount: failed.length })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
