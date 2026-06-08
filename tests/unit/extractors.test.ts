/**
 * 平台提取器测试（基于 fixture，不依赖网络）
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, '..', 'fixtures', name), 'utf-8')

import { extractWechatInfo } from '../../src/platforms/wechat/wechat-article.extractor.js'
import { extractJuejinInfo } from '../../src/platforms/juejin/juejin-article.extractor.js'
import { extractGenericInfo } from '../../src/platforms/generic/generic-article.extractor.js'
import { parseAlbumInfo } from '../../src/platforms/wechat/wechat-album.extractor.js'

describe('WeChat extractor', () => {
  it('should extract title', () => {
    const info = extractWechatInfo(fixture('wechat-article.html'))
    expect(info.title).toBe('测试微信文章标题')
  })

  it('should extract author', () => {
    const info = extractWechatInfo(fixture('wechat-article.html'))
    expect(info.author).toBe('测试公众号')
  })

  it('should extract publish time', () => {
    const info = extractWechatInfo(fixture('wechat-article.html'))
    expect(info.publishTime).toBe('2024-01-15 10:30')
  })

  it('should extract content', () => {
    const info = extractWechatInfo(fixture('wechat-article.html'))
    expect(info.contentText).toContain('测试内容')
    expect(info.contentHtml).toContain('<strong>测试内容</strong>')
  })

  it('should return empty strings for missing fields (no fake data)', () => {
    const info = extractWechatInfo('<html><body></body></html>')
    expect(info.title).toBe('')
    expect(info.author).toBe('')
  })
})

describe('Juejin extractor', () => {
  it('should extract title', () => {
    const info = extractJuejinInfo(fixture('juejin-article.html'))
    expect(info.title).toBe('掘金测试文章标题')
  })

  it('should extract author', () => {
    const info = extractJuejinInfo(fixture('juejin-article.html'))
    expect(info.author).toBe('测试作者')
  })

  it('should extract tags', () => {
    const info = extractJuejinInfo(fixture('juejin-article.html'))
    expect(info.tags).toContain('TypeScript')
    expect(info.tags).toContain('Web开发')
  })

  it('should extract view count', () => {
    const info = extractJuejinInfo(fixture('juejin-article.html'))
    expect(info.viewCount).toBe('1234')
  })

  it('should extract content', () => {
    const info = extractJuejinInfo(fixture('juejin-article.html'))
    expect(info.contentText).toContain('测试内容')
  })
})

describe('Generic extractor', () => {
  it('should extract title', () => {
    const info = extractGenericInfo(fixture('generic-article.html'))
    expect(info.title).toBe('通用网页文章标题')
  })

  it('should extract author from meta tag', () => {
    const info = extractGenericInfo(fixture('generic-article.html'))
    expect(info.author).toBe('通用作者')
  })

  it('should extract publish time', () => {
    const info = extractGenericInfo(fixture('generic-article.html'))
    expect(info.publishTime).toBeTruthy()
  })

  it('should extract content from article tag', () => {
    const info = extractGenericInfo(fixture('generic-article.html'))
    expect(info.contentText).toContain('测试内容')
    expect(info.contentHtml).toContain('<strong>')
  })
})

describe('parseAlbumInfo', () => {
  it('should parse valid album URL', () => {
    const url = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI1MzYx&action=getalbum&album_id=123456'
    const info = parseAlbumInfo(url)
    expect(info).not.toBeNull()
    expect(info!.biz).toBe('MzI1MzYx')
    expect(info!.action).toBe('getalbum')
    expect(info!.albumId).toBe('123456')
  })

  it('should return null for incomplete URL', () => {
    const url = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI1MzYx'
    expect(parseAlbumInfo(url)).toBeNull()
  })

  it('should return null for non-album URL', () => {
    expect(parseAlbumInfo('https://example.com')).toBeNull()
  })
})
