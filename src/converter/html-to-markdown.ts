/**
 * HTML → Markdown 转换器
 * 基于 cheerio 解析 + 递归遍历，忠实还原 Python 版行为
 */

import * as cheerio from 'cheerio'
import type { AnyNode, Element as DomElement } from 'domhandler'
import { buildProxyImageUrl } from '../utils/url.js'
import { detectCodeLanguage, cleanCodeContent } from '../utils/text.js'

/**
 * 将 HTML 字符串转换为 Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  const $ = cheerio.load(html, { xmlMode: false })
  return convertNode($, $.root())
}

function convertNode($: cheerio.CheerioAPI, node: cheerio.Cheerio<AnyNode>): string {
  let md = ''

  node.contents().each((_, child) => {
    if (child.type === 'text') {
      const text = $(child).text().trim()
      if (text) md += text
      return
    }

    if (child.type !== 'tag') return

    const el = $(child)
    const tag = (child as DomElement).tagName?.toLowerCase()

    switch (tag) {
      case 'br':
        md += '\n'
        break

      case 'p':
      case 'div':
      case 'section': {
        const content = convertNode($, el).trim()
        if (content) md += '\n\n' + content + '\n'
        break
      }

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = parseInt(tag[1]!, 10)
        const content = convertNode($, el).trim()
        if (content) md += '\n' + '#'.repeat(level) + ' ' + content + '\n'
        break
      }

      case 'strong':
      case 'b': {
        const content = convertNode($, el).trim()
        if (content) md += '**' + content + '**'
        break
      }

      case 'em':
      case 'i': {
        const content = convertNode($, el).trim()
        if (content) md += '*' + content + '*'
        break
      }

      case 'img': {
        const src = el.attr('data-src') ?? el.attr('src') ?? ''
        const alt = el.attr('alt') ?? ''
        if (src) {
          const proxySrc = buildProxyImageUrl(src)
          md += `\n![${alt}](${proxySrc})\n`
        }
        break
      }

      case 'a': {
        const href = el.attr('href') ?? ''
        const text = convertNode($, el).trim()
        if (href && text) {
          md += `[${text}](${href})`
        } else if (text) {
          md += text
        }
        break
      }

      case 'ul':
      case 'ol': {
        const listContent = convertList($, el, tag === 'ol')
        if (listContent) md += '\n' + listContent + '\n'
        break
      }

      case 'code': {
        // 行内 code（如果父元素是 pre，由 pre 处理）
        const parent = (child as DomElement).parent
        if (parent && parent.type === 'tag' && (parent as DomElement).tagName?.toLowerCase() === 'pre') break
        const codeContent = el.text().trim()
        if (codeContent) md += '`' + codeContent + '`'
        break
      }

      case 'pre': {
        const codeContent = extractCodeFromPre(el)
        const language = detectPreLanguage($, el)
        if (codeContent) {
          if (language) {
            md += `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`
          } else {
            md += `\n\`\`\`\n${codeContent}\n\`\`\`\n`
          }
        }
        break
      }

      default: {
        md += convertNode($, el)
      }
    }
  })

  return md
}

function convertList($: cheerio.CheerioAPI, listEl: cheerio.Cheerio<AnyNode>, ordered: boolean): string {
  let md = ''
  let index = 1

  listEl.children('li').each((_, item) => {
    const content = convertNode($, $(item)).trim()
    if (content) {
      if (ordered) {
        md += `${index}. ${content}\n`
        index++
      } else {
        md += `- ${content}\n`
      }
    }
  })

  return md
}

function extractCodeFromPre(preEl: cheerio.Cheerio<AnyNode>): string {
  const codeEl = preEl.find('code')
  const raw = codeEl.length > 0 ? codeEl.text() : preEl.text()
  return cleanCodeContent(raw)
}

function detectPreLanguage(_$: cheerio.CheerioAPI, preEl: cheerio.Cheerio<AnyNode>): string | null {
  // 从 pre 的 class 检测
  const preClasses = (preEl.attr('class') ?? '').split(/\s+/).filter(Boolean)
  let lang = detectCodeLanguage(preClasses)
  if (lang) return lang

  // 从内部 code 的 class 检测
  const codeEl = preEl.find('code')
  if (codeEl.length > 0) {
    const codeClasses = (codeEl.attr('class') ?? '').split(/\s+/).filter(Boolean)
    lang = detectCodeLanguage(codeClasses)
    if (lang) return lang

    // data-language 属性
    const dataLang = codeEl.attr('data-language') ?? codeEl.attr('lang')
    if (dataLang) return dataLang.toLowerCase()
  }

  // pre 的 data-language 属性
  const preDataLang = preEl.attr('data-language') ?? preEl.attr('lang')
  if (preDataLang) return preDataLang.toLowerCase()

  return null
}
