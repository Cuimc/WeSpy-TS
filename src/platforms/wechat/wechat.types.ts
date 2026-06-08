/**
 * WeChat 平台相关类型
 */

export interface WechatArticleInfo {
  title: string
  author: string
  publishTime: string
  contentHtml: string
  contentText: string
}

export interface WechatAlbumInfo {
  biz: string
  action: string
  albumId: string
  originalUrl: string
}
