/**
 * URL 工具函数
 */

/**
 * 从 URL 中提取域名（不含 www. 前缀）
 * URL 无效时返回 null
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return null
  }
}

/**
 * 检测 URL 对应的平台
 * URL 无效时返回 null（不静默路由到 generic）
 */
export function detectPlatform(url: string): 'wechat' | 'wechat-album' | 'juejin' | 'generic' | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()

    if (host.includes('mp.weixin.qq.com')) {
      if (parsed.pathname.includes('/mp/appmsgalbum')) {
        return 'wechat-album'
      }
      return 'wechat'
    }

    if (host.includes('juejin.cn')) {
      return 'juejin'
    }

    return 'generic'
  } catch {
    return null
  }
}

/**
 * 移除 URL 末尾的 #rd 后缀（微信文章常见）
 */
export function stripHashSuffix(url: string): string {
  return url.replace(/#rd$/, '')
}

/**
 * 构建代理图片 URL（使用 images.weserv.nl 绕过防盗链）
 */
export function buildProxyImageUrl(originalUrl: string): string {
  if (!originalUrl || !originalUrl.startsWith('http')) {
    return originalUrl
  }

  const encodedUrl = encodeURIComponent(originalUrl)
  let proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}`

  // GIF 图片添加特殊参数
  if (
    originalUrl.toLowerCase().includes('gif') ||
    originalUrl.toLowerCase().includes('wx_fmt=gif')
  ) {
    proxyUrl += '&n=-1'
  }

  return proxyUrl
}
