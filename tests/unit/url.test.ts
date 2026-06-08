/**
 * URL 工具测试
 */

import { describe, it, expect } from 'vitest'
import { extractDomain, detectPlatform, stripHashSuffix, buildProxyImageUrl } from '../../src/utils/url.js'

describe('extractDomain', () => {
  it('should extract domain without www', () => {
    expect(extractDomain('https://www.example.com/path')).toBe('example.com')
  })

  it('should handle domains without www', () => {
    expect(extractDomain('https://mp.weixin.qq.com/s/xxx')).toBe('mp.weixin.qq.com')
  })

  it('should return null for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBeNull()
  })
})

describe('detectPlatform', () => {
  it('should detect wechat article', () => {
    expect(detectPlatform('https://mp.weixin.qq.com/s/xxxxx')).toBe('wechat')
  })

  it('should detect wechat album', () => {
    expect(detectPlatform('https://mp.weixin.qq.com/mp/appmsgalbum?__biz=xxx&action=getalbum')).toBe('wechat-album')
  })

  it('should detect juejin', () => {
    expect(detectPlatform('https://juejin.cn/post/7123456789')).toBe('juejin')
  })

  it('should detect generic', () => {
    expect(detectPlatform('https://example.com/article')).toBe('generic')
  })
})

describe('stripHashSuffix', () => {
  it('should remove #rd suffix', () => {
    expect(stripHashSuffix('https://example.com/article#rd')).toBe('https://example.com/article')
  })

  it('should leave other URLs unchanged', () => {
    expect(stripHashSuffix('https://example.com/article')).toBe('https://example.com/article')
  })
})

describe('buildProxyImageUrl', () => {
  it('should wrap HTTP URLs with proxy', () => {
    const result = buildProxyImageUrl('https://example.com/img.jpg')
    expect(result).toContain('images.weserv.nl')
    expect(result).toContain(encodeURIComponent('https://example.com/img.jpg'))
  })

  it('should add GIF parameter for gif images', () => {
    const result = buildProxyImageUrl('https://example.com/anim.gif')
    expect(result).toContain('&n=-1')
  })

  it('should add GIF parameter for wx_fmt=gif', () => {
    const result = buildProxyImageUrl('https://mmbiz.qpic.cn/img?wx_fmt=gif')
    expect(result).toContain('&n=-1')
  })

  it('should return non-HTTP URLs as-is', () => {
    expect(buildProxyImageUrl('data:image/png;base64,...')).toBe('data:image/png;base64,...')
  })

  it('should return empty string as-is', () => {
    expect(buildProxyImageUrl('')).toBe('')
  })
})
