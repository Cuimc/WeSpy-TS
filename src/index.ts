/**
 * WeSpy SDK 入口
 * 提供 fetchArticle / fetchAlbum API 供外部项目 import 使用
 */

export { fetchArticle } from './sdk/fetch-article.js'
export { fetchAlbum } from './sdk/fetch-album.js'
export { fetchAlbumList } from './sdk/fetch-album-list.js'

// 核心类型
export type {
  SupportedPlatform,
  OutputFormat,
  FetchArticleInput,
  FetchAlbumInput,
  FetchAlbumListInput,
  ArticleDraft,
  ArticleImage,
  OutputArtifact,
  FetchArticleResult,
  FetchArticleSuccess,
  FetchArticleAlbumSuccess,
  FetchArticleFailure,
  FetchAlbumResult,
  FetchAlbumSuccess,
  FetchAlbumFailure,
  FetchAlbumListResult,
  FetchAlbumListSuccess,
  FetchAlbumListFailure,
  AlbumArticleEntry,
  WeSpyError,
} from './core/types.js'

export {
  FetchArticleInputSchema,
  FetchAlbumInputSchema,
  FetchAlbumListInputSchema,
} from './core/types.js'

// Result 工具
export type { Result } from './core/result.js'
export { ok, err, isOk, isErr, unwrap, unwrapOr } from './core/result.js'

// 错误工厂
export {
  WeSpyException,
  createError,
  networkError,
  httpStatusError,
  timeoutError,
  parseEmptyError,
  unsupportedUrlError,
  invalidInputError,
  fileSystemError,
} from './core/errors.js'

// 平台检测
export { detectPlatform, isWechatUrl, isJuejinUrl } from './platforms/detector.js'
