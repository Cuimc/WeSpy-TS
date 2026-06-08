/**
 * 文本工具测试
 */

import { describe, it, expect } from 'vitest'
import { sanitizeFilename, detectCodeLanguage, cleanCodeContent } from '../../src/utils/text.js'

describe('sanitizeFilename', () => {
  it('should remove illegal characters', () => {
    expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file_________name')
  })

  it('should truncate to max length', () => {
    const long = 'a'.repeat(100)
    expect(sanitizeFilename(long)).toHaveLength(50)
  })

  it('should preserve normal filenames', () => {
    expect(sanitizeFilename('正常文件名')).toBe('正常文件名')
  })

  it('should collapse whitespace', () => {
    expect(sanitizeFilename('hello   world')).toBe('hello world')
  })
})

describe('detectCodeLanguage', () => {
  it('should detect typescript', () => {
    expect(detectCodeLanguage(['language-typescript'])).toBe('typescript')
  })

  it('should detect python', () => {
    expect(detectCodeLanguage(['language-python'])).toBe('python')
  })

  it('should detect via partial match', () => {
    expect(detectCodeLanguage(['brush:language-javascript'])).toBe('javascript')
  })

  it('should return null for unknown classes', () => {
    expect(detectCodeLanguage(['some-random-class'])).toBeNull()
  })

  it('should return null for empty array', () => {
    expect(detectCodeLanguage([])).toBeNull()
  })
})

describe('cleanCodeContent', () => {
  it('should strip leading empty lines', () => {
    expect(cleanCodeContent('\n\n  code\n  ')).toBe('  code\n  ')
  })

  it('should preserve internal structure', () => {
    expect(cleanCodeContent('line1\n\nline3')).toBe('line1\n\nline3')
  })

  it('should handle empty input', () => {
    expect(cleanCodeContent('')).toBe('')
  })
})
