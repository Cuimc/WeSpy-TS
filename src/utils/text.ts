/**
 * 文本工具函数
 */

/**
 * 清理文件名中的非法字符
 */
export function sanitizeFilename(title: string, maxLen = 50): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * 语言 class 到语言名的映射表
 */
const LANGUAGE_MAPPING: Record<string, string> = {
  'language-python': 'python',
  'language-javascript': 'javascript',
  'language-js': 'javascript',
  'language-typescript': 'typescript',
  'language-ts': 'typescript',
  'language-java': 'java',
  'language-cpp': 'cpp',
  'language-c++': 'cpp',
  'language-c': 'c',
  'language-csharp': 'csharp',
  'language-c#': 'csharp',
  'language-go': 'go',
  'language-rust': 'rust',
  'language-php': 'php',
  'language-ruby': 'ruby',
  'language-python3': 'python',
  'language-py': 'python',
  'language-html': 'html',
  'language-css': 'css',
  'language-scss': 'scss',
  'language-sass': 'sass',
  'language-json': 'json',
  'language-xml': 'xml',
  'language-yaml': 'yaml',
  'language-yml': 'yaml',
  'language-sql': 'sql',
  'language-bash': 'bash',
  'language-shell': 'bash',
  'language-sh': 'bash',
  'language-markdown': 'markdown',
  'language-md': 'markdown',
  'language-dockerfile': 'dockerfile',
  'language-docker': 'dockerfile',
  'language-git': 'git',
  'language-diff': 'diff',
  'language-text': 'text',
  'language-plain': 'text',
}

/**
 * 从 CSS class 列表中检测代码语言
 */
export function detectCodeLanguage(classes: string[]): string | null {
  // 精确匹配
  for (const cls of classes) {
    if (cls in LANGUAGE_MAPPING) {
      return LANGUAGE_MAPPING[cls]
    }
  }
  // 部分匹配
  for (const cls of classes) {
    for (const [key, lang] of Object.entries(LANGUAGE_MAPPING)) {
      if (cls.includes(key)) {
        return lang
      }
    }
  }
  return null
}

/**
 * 清理代码块内容：去除前导空行，保留缩进（与 Python 版一致，保留末尾空行）
 */
export function cleanCodeContent(code: string): string {
  const lines = code.split('\n')
  const cleaned: string[] = []
  for (const line of lines) {
    if (line.trim() || cleaned.length > 0) {
      cleaned.push(line)
    }
  }
  return cleaned.join('\n')
}

/**
 * 格式化本地时间: YYYY-MM-DD HH:MM:SS（与 Python time.strftime 一致）
 */
export function formatLocalTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
