/**
 * fetchAlbum SDK API
 */

import type {
  FetchAlbumInput,
  FetchAlbumResult,
  FetchAlbumFailure,
} from '../core/types.js'
import { FetchAlbumInputSchema } from '../core/types.js'
import type { WeSpyError } from '../core/types.js'
import { HttpClient } from '../fetcher/http-client.js'
import { fetchAlbumArticles } from '../platforms/wechat/wechat-album.extractor.js'
import { isWechatAlbumUrl } from '../platforms/detector.js'
import { unsupportedUrlError, invalidInputError } from '../core/errors.js'

/**
 * 获取微信专辑中的文章列表并批量下载
 *
 * @example
 * ```ts
 * import { fetchAlbum } from 'wespy'
 *
 * const result = await fetchAlbum({
 *   url: 'https://mp.weixin.qq.com/mp/appmsgalbum?...',
 *   maxArticles: 5,
 *   format: ['markdown'],
 * })
 *
 * if (result.ok) {
 *   console.log(`成功获取 ${result.articles.length} 篇文章`)
 * }
 * ```
 */
export async function fetchAlbum(input: FetchAlbumInput): Promise<FetchAlbumResult> {
  // 输入校验
  const parsed = FetchAlbumInputSchema.safeParse(input)
  if (!parsed.success) {
    return failure(invalidInputError(parsed.error.issues.map((i) => i.message).join('; ')))
  }

  const { url, outputDir, format, maxArticles, timeoutMs, downloadImages } = parsed.data

  if (downloadImages) {
    return failure(invalidInputError('downloadImages 尚未实现；Python 原版仅在 Markdown 中转换图片代理 URL'))
  }

  if (!isWechatAlbumUrl(url)) {
    return failure(unsupportedUrlError('fetchAlbum 仅支持微信专辑 URL'))
  }

  const httpClient = new HttpClient({ timeoutMs })

  try {
    const res = await fetchAlbumArticles(url, httpClient, outputDir, format, maxArticles)
    if (!res.ok) return failure(res.error)

    return {
      ok: true,
      articles: res.value.articles,
      artifacts: res.value.artifacts,
      warnings: [],
      summaryFile: res.value.summaryFile,
      failedCount: res.value.failedCount,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return failure({
      code: 'UNKNOWN_ERROR',
      message,
      retryable: false,
      details: { url },
    })
  }
}

function failure(error: WeSpyError): FetchAlbumFailure {
  return { ok: false, error }
}
