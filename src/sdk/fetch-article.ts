/**
 * fetchArticle SDK API
 */

import type {
  FetchArticleInput,
  FetchArticleResult,
  FetchArticleSuccess,
  FetchArticleAlbumSuccess,
  FetchArticleFailure,
  OutputArtifact,
} from '../core/types.js'
import { FetchArticleInputSchema } from '../core/types.js'
import type { WeSpyError } from '../core/types.js'
import { HttpClient } from '../fetcher/http-client.js'
import { detectPlatform } from '../utils/url.js'
import { fetchWechatArticle } from '../platforms/wechat/wechat-article.extractor.js'
import { fetchJuejinArticle } from '../platforms/juejin/juejin-article.extractor.js'
import { fetchGenericArticle } from '../platforms/generic/generic-article.extractor.js'
import { unsupportedUrlError, invalidInputError } from '../core/errors.js'
import { fetchAlbum } from './fetch-album.js'

/**
 * 获取单篇文章
 *
 * @example
 * ```ts
 * import { fetchArticle } from 'wespy'
 *
 * const result = await fetchArticle({
 *   url: 'https://mp.weixin.qq.com/s/xxxxx',
 *   format: ['markdown', 'json'],
 * })
 *
 * if (result.ok) {
 *   console.log(result.article.title)
 *   console.log(result.article.markdown)
 * }
 * ```
 */
export async function fetchArticle(input: FetchArticleInput): Promise<FetchArticleResult> {
  // 输入校验
  const parsed = FetchArticleInputSchema.safeParse(input)
  if (!parsed.success) {
    return failure(invalidInputError(parsed.error.issues.map((i) => i.message).join('; ')))
  }

  const { url, outputDir, format, timeoutMs, userAgent, headers, downloadImages } = parsed.data

  if (downloadImages) {
    return failure(invalidInputError('downloadImages 尚未实现；Python 原版仅在 Markdown 中转换图片代理 URL'))
  }

  const httpClient = new HttpClient({ timeoutMs, userAgent, headers })
  const platform = detectPlatform(url)

  if (!platform) {
    return failure(unsupportedUrlError(url))
  }

  try {
    let result: { article: import('../core/types.js').ArticleDraft; artifacts: OutputArtifact[] }

    switch (platform) {
      case 'wechat': {
        const res = await fetchWechatArticle(url, httpClient, outputDir, format)
        if (!res.ok) return failure(res.error)
        result = res.value
        break
      }
      case 'juejin': {
        const res = await fetchJuejinArticle(url, httpClient, outputDir, format)
        if (!res.ok) return failure(res.error)
        result = res.value
        break
      }
      case 'generic': {
        const res = await fetchGenericArticle(url, httpClient, outputDir, format)
        if (!res.ok) return failure(res.error)
        result = res.value
        break
      }
      case 'wechat-album': {
        const albumResult = await fetchAlbum({ url, outputDir, format, timeoutMs, maxArticles: 10 })
        if (!albumResult.ok) return failure(albumResult.error)
        return albumSuccess(
          albumResult.articles,
          albumResult.artifacts,
          albumResult.warnings,
          albumResult.summaryFile,
          albumResult.failedCount,
        )
      }
      default:
        return failure(unsupportedUrlError(url))
    }

    return success(result.article, result.artifacts)
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

function albumSuccess(
  articles: import('../core/types.js').ArticleDraft[],
  artifacts: OutputArtifact[],
  warnings: string[],
  summaryFile?: string,
  failedCount?: number,
): FetchArticleAlbumSuccess {
  return {
    ok: true,
    articles,
    artifacts,
    warnings,
    summaryFile,
    failedCount,
  }
}

function success(
  article: import('../core/types.js').ArticleDraft,
  artifacts: OutputArtifact[],
): FetchArticleSuccess {
  return {
    ok: true,
    article,
    artifacts,
    warnings: article.warnings,
  }
}

function failure(error: WeSpyError): FetchArticleFailure {
  return { ok: false, error }
}
