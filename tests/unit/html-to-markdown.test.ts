/**
 * HTML → Markdown 转换测试
 */

import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../../src/converter/html-to-markdown.js'

describe('htmlToMarkdown', () => {
  it('should return empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
  })

  it('should convert plain text', () => {
    expect(htmlToMarkdown('Hello World')).toContain('Hello World')
  })

  it('should convert headings', () => {
    const html = '<h1>标题一</h1><h2>标题二</h2><h3>标题三</h3>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('# 标题一')
    expect(md).toContain('## 标题二')
    expect(md).toContain('### 标题三')
  })

  it('should convert bold and italic', () => {
    const html = '<p><strong>粗体</strong>和<em>斜体</em></p>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('**粗体**')
    expect(md).toContain('*斜体*')
  })

  it('should convert links', () => {
    const html = '<a href="https://example.com">链接文本</a>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('[链接文本](https://example.com)')
  })

  it('should convert images with proxy URL', () => {
    const html = '<img src="https://example.com/img.jpg" alt="图片" />'
    const md = htmlToMarkdown(html)
    expect(md).toContain('![图片]')
    expect(md).toContain('images.weserv.nl')
  })

  it('should prefer data-src over src for WeChat lazy loading', () => {
    const html = '<img data-src="https://mmbiz.qpic.cn/real.jpg" src="placeholder.gif" alt="微信图" />'
    const md = htmlToMarkdown(html)
    expect(md).toContain('real.jpg')
  })

  it('should convert unordered lists', () => {
    const html = '<ul><li>项目一</li><li>项目二</li></ul>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('- 项目一')
    expect(md).toContain('- 项目二')
  })

  it('should convert ordered lists', () => {
    const html = '<ol><li>第一项</li><li>第二项</li></ol>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('1. 第一项')
    expect(md).toContain('2. 第二项')
  })

  it('should convert inline code', () => {
    const html = '<p>使用 <code>console.log()</code> 输出</p>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('`console.log()`')
  })

  it('should convert code blocks with language detection', () => {
    const html = '<pre><code class="language-typescript">const x = 1;</code></pre>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('```typescript')
    expect(md).toContain('const x = 1;')
  })

  it('should convert code blocks without language', () => {
    const html = '<pre><code>plain code</code></pre>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('```\nplain code\n```')
  })

  it('should handle nested elements', () => {
    const html = '<div><p>段落一</p><p>段落二</p></div>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('段落一')
    expect(md).toContain('段落二')
  })

  it('should convert WeChat article content', () => {
    const html = `
      <p>微信文章<strong>正文</strong>内容。</p>
      <p>包含<a href="https://example.com">链接</a>和图片：</p>
      <img data-src="https://mmbiz.qpic.cn/test.jpg" alt="测试" />
    `
    const md = htmlToMarkdown(html)
    expect(md).toContain('**正文**')
    expect(md).toContain('[链接](https://example.com)')
    expect(md).toContain('![测试]')
  })
})
