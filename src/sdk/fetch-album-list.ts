/**
 * fetchAlbumList SDK API —— 仅获取专辑文章列表，不下载文章内容
 * 对应 Python 版 album_fetcher.fetch_album_articles()
 */

import type {
  FetchAlbumListInput,
  FetchAlbumListResult,
  FetchAlbumListFailure,
} from '../core/types.js'
import { FetchAlbumListInputSchema } from '../core/types.js'
import type { WeSpyError } from '../core/types.js'
import { HttpClient } from '../fetcher/http-client.js'
import { fetchAlbumArticleList } from '../platforms/wechat/wechat-album.extractor.js'
import { isWechatAlbumUrl } from '../platforms/detector.js'
import { unsupportedUrlError, invalidInputError } from '../core/errors.js'

/**
 * 获取微信专辑文章列表（仅 API，不下载文章内容）
 */
export async function fetchAlbumList(input: FetchAlbumListInput): Promise<FetchAlbumListResult> {
  const parsed = FetchAlbumListInputSchema.safeParse(input)
  if (!parsed.success) {
    return failure(invalidInputError(parsed.error.issues.map((i) => i.message).join('; ')))
  }

  const { url, maxArticles, timeoutMs } = parsed.data

  if (!isWechatAlbumUrl(url)) {
    return failure(unsupportedUrlError('fetchAlbumList 仅支持微信专辑 URL'))
  }

  const httpClient = new HttpClient({ timeoutMs })

  const res = await fetchAlbumArticleList(url, httpClient, maxArticles)
  if (!res.ok) return failure(res.error)

  return { ok: true, articles: res.value, warnings: [] }
}

function failure(error: WeSpyError): FetchAlbumListFailure {
  return { ok: false, error }
}
