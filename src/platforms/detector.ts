/**
 * URL 平台检测器
 */

import { detectPlatform } from '../utils/url.js'
import type { SupportedPlatform } from '../core/types.js'

export { detectPlatform }

export function isWechatUrl(url: string): boolean {
  const p = detectPlatform(url)
  return p === 'wechat' || p === 'wechat-album'
}

export function isWechatAlbumUrl(url: string): boolean {
  return detectPlatform(url) === 'wechat-album'
}

export function isJuejinUrl(url: string): boolean {
  return detectPlatform(url) === 'juejin'
}

/**
 * 检测 URL 是否有效（可被 URL 解析器解析）
 */
export function isValidUrl(url: string): boolean {
  return detectPlatform(url) !== null
}

export function getPlatformLabel(platform: SupportedPlatform): string {
  switch (platform) {
    case 'wechat': return '微信公众号'
    case 'wechat-album': return '微信专辑'
    case 'juejin': return '掘金'
    case 'generic': return '通用网页'
  }
}
