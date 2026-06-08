/**
 * HTML 清理工具
 * 用于清理掘金等内容中的冗余样式
 */

import * as cheerio from 'cheerio'

/**
 * 清理 HTML 内容：
 * - 移除 <style> 标签
 * - 移除 data-highlight 属性元素
 * - 移除 inline style 属性
 */
export function sanitizeHtml(html: string): string {
  const $ = cheerio.load(html, { xmlMode: false })

  // 移除所有 style 标签
  $('style').remove()

  // 移除 data-highlight 属性元素
  $('[data-highlight]').remove()

  // 移除所有元素的 style 属性
  $('[style]').removeAttr('style')

  return $.html()
}
