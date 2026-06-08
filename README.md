# WeSpy (TypeScript)

文章抓取与 Markdown 转换工具 — TypeScript 版本。

## 支持平台

| 平台 | 单篇文章 | 专辑/合集 |
|------|---------|----------|
| 微信公众号 (`mp.weixin.qq.com`) | ✅ | ✅ |
| 掘金 (`juejin.cn`) | ✅ | — |
| 通用网页 | ✅ | — |

## 安装

```bash
npm install
npm run build
```

## CLI 使用

```bash
# 获取单篇文章（默认输出 Markdown）
node dist/cli/main.js fetch-article https://mp.weixin.qq.com/s/xxxxx

# 指定输出格式和目录
node/dist/cli/main.js fetch-article https://mp.weixin.qq.com/s/xxxxx -o ./output --all

# 批量下载微信专辑
node dist/cli/main.js fetch-album https://mp.weixin.qq.com/mp/appmsgalbum?... --max 5

# 智能模式（自动判断 URL 类型）
node dist/cli/main.js https://mp.weixin.qq.com/s/xxxxx -o ./output --html --json
```

### CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <dir>` | 输出目录 | `articles` |
| `--html` | 同时保存 HTML 文件 | false |
| `--json` | 同时保存 JSON 文件 | false |
| `--all` | 保存所有格式 | false |
| `--max <n>` | 专辑最大下载数 | 10 |
| `--timeout <ms>` | 请求超时时间 | 30000 |
| `--album-only` | 仅获取文章列表 | false |

## SDK API

```typescript
import { fetchArticle, fetchAlbum } from 'wespy'

// 获取单篇文章
const result = await fetchArticle({
  url: 'https://mp.weixin.qq.com/s/xxxxx',
  format: ['markdown', 'json'],
  outputDir: './output',
})

if (result.ok) {
  console.log(result.article.title)
  console.log(result.article.markdown)
  console.log(result.artifacts)
} else {
  console.error(result.error.code, result.error.message)
}

// 批量获取专辑
const albumResult = await fetchAlbum({
  url: 'https://mp.weixin.qq.com/mp/appmsgalbum?...',
  maxArticles: 10,
  format: ['markdown'],
})

if (albumResult.ok) {
  console.log(`获取了 ${albumResult.articles.length} 篇文章`)
}
```

## 输出结构

### ArticleDraft

```typescript
interface ArticleDraft {
  platform: 'wechat' | 'juejin' | 'generic'
  url: string
  title: string
  author?: string
  publishTime?: string
  contentHtml?: string
  contentText?: string
  markdown?: string
  metadata: Record<string, unknown>
  fetchedAt: string
  warnings: string[]
}
```

### FetchArticleResult

```typescript
// 成功
{ ok: true, article: ArticleDraft, artifacts: OutputArtifact[], warnings: string[] }

// 失败
{ ok: false, error: { code: string, message: string, retryable: boolean } }
```

## 测试

```bash
npm test
```

## 开发

```bash
npm run dev    # watch 模式
npm run lint   # 类型检查
```

## Python 原版

Python 原版代码保留在 `../WeSpy/` 目录中，未被删除。详见 [MIGRATION.md](./MIGRATION.md)。
