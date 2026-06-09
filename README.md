# WeSpy-TS

[![npm version](https://img.shields.io/npm/v/wespy-ts)](https://www.npmjs.com/package/wespy-ts)
[![Node.js Support](https://img.shields.io/node/v/wespy-ts)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/npm/l/wespy-ts)](https://opensource.org/licenses/MIT)

WeSpy-TS 是用于获取微信公众号文章并转换为 Markdown 格式的 TypeScript 工具，支持图片防盗链处理、专辑批量下载和多种输出格式。提供 CLI 命令行和 SDK API 两种使用方式。

> 本项目由 Python 版 [WeSpy](https://github.com/tianchangNorth/WeSpy) 重构而来，保留了原有核心能力，并提供了更完善的类型定义和模块化架构。详见 [MIGRATION.md](./MIGRATION.md)。

## 特性

- 🚀 **智能文章提取**：自动识别文章标题、作者、发布时间和正文内容
- 📱 **微信公众号支持**：专门优化微信公众号文章的提取，支持长短链接自动转换
- 🎵 **专辑批量下载**：支持微信公众号专辑文章批量获取和下载
- 🖼️ **图片防盗链处理**：自动处理图片防盗链问题，确保图片正常显示
- 📝 **灵活输出配置**：默认只输出 Markdown，可选择 HTML 和 JSON 格式
- 🌐 **通用网页支持**：支持大多数网站的文章提取（掘金等平台专项优化）
- 🎯 **命令行友好**：提供简单易用的命令行界面，支持交互模式
- 📂 **批量处理**：支持批量处理多个文章链接和专辑文章
- 🔒 **类型安全**：完整的 TypeScript 类型定义，支持 Zod 输入校验
- 📦 **双模使用**：既可作为 CLI 工具，也可作为 SDK 被其他项目 import

## 支持平台

| 平台 | 单篇文章 | 专辑/合集 |
|------|---------|----------|
| 微信公众号 (`mp.weixin.qq.com`) | ✅ | ✅ |
| 掘金 (`juejin.cn`) | ✅ | — |
| 通用网页 | ✅ | — |

## 安装

### 使用 npm 全局安装（推荐）

```bash
npm install -g wespy-ts
```

### 作为项目依赖安装

```bash
npm install wespy-ts
```

### 使用 npx 直接运行（无需安装）

```bash
npx wespy-ts fetch-article https://mp.weixin.qq.com/s/xxxxx
```

### 从源码安装

```bash
git clone https://github.com/Cuimc/WeSpy-TS.git
cd WeSpy-TS
npm install
npm run build
```

## 快速开始

### 命令行使用

全局安装后直接使用 `wespy` 命令：

```bash
# 获取微信公众号文章（默认只输出 Markdown）
wespy "https://mp.weixin.qq.com/s/xxxxx"

# 指定输出目录
wespy "https://mp.weixin.qq.com/s/xxxxx" -o /path/to/output

# 输出 Markdown + HTML 格式
wespy "https://example.com/article" --html

# 输出 Markdown + JSON 格式
wespy "https://example.com/article" --json

# 输出所有格式（HTML + JSON + Markdown）
wespy "https://example.com/article" --all

# 显示详细信息
wespy "https://example.com/article" -v

# === 微信专辑功能 ===

# 获取微信专辑文章列表（不下载内容）
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --album-only

# 批量下载微信专辑文章（默认下载前 10 篇）
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..."

# 限制专辑文章下载数量
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --max 5

# 下载专辑文章并保存所有格式
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --max 5 --all
```

也可以使用子命令方式，更加明确：

```bash
# 获取单篇文章
wespy fetch-article "https://mp.weixin.qq.com/s/xxxxx" -o ./output --all

# 批量下载专辑
wespy fetch-album "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --max 5
```

### 交互式使用

如果不提供任何参数，程序会进入交互模式：

```bash
wespy
```

然后根据提示输入文章 URL、输出目录和输出格式选择：

1. 仅 Markdown（默认）
2. Markdown + HTML
3. Markdown + JSON
4. 全部格式（HTML + JSON + Markdown）

### SDK API 使用

```typescript
import { fetchArticle, fetchAlbum, fetchAlbumList } from 'wespy-ts'

// 获取单篇文章
const result = await fetchArticle({
  url: 'https://mp.weixin.qq.com/s/xxxxx',
  format: ['markdown', 'json'],
  outputDir: './output',
})

if (result.ok) {
  console.log(result.article.title)
  console.log(result.article.author)
  console.log(result.article.markdown)
  console.log(result.artifacts)
} else {
  console.error(result.error.code, result.error.message)
}

// 批量获取专辑文章
const albumResult = await fetchAlbum({
  url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=...',
  maxArticles: 10,
  format: ['markdown'],
  outputDir: './output',
})

if (albumResult.ok) {
  console.log(`获取了 ${albumResult.articles.length} 篇文章`)
  for (const article of albumResult.articles) {
    console.log(`- ${article.title}`)
  }
}

// 仅获取专辑文章列表（不下载内容）
const listResult = await fetchAlbumList({
  url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=...',
  maxArticles: 20,
})

if (listResult.ok) {
  for (const entry of listResult.articles) {
    console.log(`${entry.title} - ${entry.url}`)
  }
}
```

## 输出格式

WeSpy-TS 默认只生成 Markdown 文件，但可以通过配置选项选择其他格式：

### 默认输出（仅 Markdown）

```
articles/
└── 文章标题_1627834567.md        # Markdown 格式
```

### 可选格式

- **Markdown 文件**：转换后的 Markdown 格式内容（默认生成）
- **HTML 文件**：原始 HTML 内容（使用 `--html` 选项）
- **JSON 文件**：文章元数据信息（使用 `--json` 选项）

### 全部格式输出示例

```
articles/
├── 文章标题_1627834567.html      # 原始 HTML
├── 文章标题_1627834567.md        # Markdown 格式
└── 文章标题_1627834567_info.json # 元数据信息
```

### JSON 元数据格式

```json
{
  "title": "文章标题",
  "author": "作者名称",
  "publishTime": "2023-07-30",
  "url": "https://example.com/article",
  "platform": "wechat",
  "fetchedAt": "2023-07-30T12:34:56.000Z"
}
```

## 命令行选项

### 通用选项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <dir>` | 输出目录 | `articles` |
| `--html` | 同时保存 HTML 文件 | false |
| `--json` | 同时保存 JSON 文件 | false |
| `--all` | 保存所有格式（HTML + JSON + Markdown） | false |
| `--timeout <ms>` | 请求超时时间（毫秒） | `30000` |
| `--download-images` | 下载图片到本地 | false |
| `-v, --verbose` | 显示详细信息 | false |

### 专辑专用选项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--max <n>` | 专辑最大下载文章数 | `10` |
| `--album-only` | 仅获取文章列表，不下载内容 | false |

### 输出格式选项说明

- **默认行为**：只生成 Markdown 文件
- **`--html`**：生成 Markdown + HTML 文件
- **`--json`**：生成 Markdown + JSON 文件
- **`--all`**：生成所有格式文件（HTML + JSON + Markdown）

## 微信专辑功能

### 功能介绍

WeSpy-TS 支持微信公众号专辑文章的批量获取和下载，可以一次性下载整个专辑中的所有文章。

### 使用方式

#### 仅获取文章列表

使用 `--album-only` 参数只获取专辑中的文章列表，不下载具体内容：

```bash
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --album-only
```

输出示例：

```
获取到 25 篇文章:
 1. 文章标题一
     URL: http://mp.weixin.qq.com/s?__biz=...
     时间: 1704067200

 2. 文章标题二
     URL: http://mp.weixin.qq.com/s?__biz=...
     时间: 1703980800
```

文章列表会保存为 JSON 文件，包含标题、URL、发布时间等完整信息。

#### 批量下载专辑文章

直接使用专辑 URL 即可批量下载专辑中的所有文章：

```bash
# 下载前 10 篇文章（默认）
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..."

# 限制下载文章数量
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --max 5

# 下载并保存所有格式
wespy "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=..." --max 5 --all
```

### 输出结构

专辑文章下载后会创建独立的专辑目录：

```
articles/
├── album_1703980800/                    # 专辑专用目录
│   ├── 文章标题一_1703980800.md         # Markdown 格式
│   ├── 文章标题一_1703980800_info.json  # 文章信息
│   ├── 文章标题二_1703980801.md         # 下一篇文章
│   └── ...
└── album_1703980800_summary.json        # 专辑下载汇总信息
```

### 汇总信息

每个专辑下载完成后会生成详细的汇总报告，包含：

- 专辑 URL 和下载时间
- 成功/失败统计
- 成功下载的文章列表
- 失败的文章列表和错误信息

### 技术特性

- **智能分页**：自动处理微信分页获取，支持大型专辑
- **错误处理**：分离成功和失败的文章，确保部分失败不影响整体下载
- **速率控制**：内置延迟机制避免请求过快
- **进度显示**：实时显示下载进度和统计信息

## 支持的网站

### 完全支持

- 微信公众号 (`mp.weixin.qq.com`)
- 掘金 (`juejin.cn`)

### 通用支持

WeSpy-TS 使用智能算法尝试从以下元素中提取内容：

- `<article>` 标签
- 带有 `content`、`article-content`、`post-content` 等 class 的元素
- `<main>` 标签
- 标准的 meta 标签信息

## SDK API 参考

### `fetchArticle(input)`

获取单篇文章。

```typescript
import { fetchArticle } from 'wespy-ts'

const result = await fetchArticle({
  url: 'https://mp.weixin.qq.com/s/xxxxx',
  outputDir: './output',         // 输出目录，默认 'articles'
  format: ['markdown'],          // 输出格式，默认 ['markdown']
  timeoutMs: 30000,              // 超时时间，默认 30000
  downloadImages: false,         // 是否下载图片
  userAgent: 'custom-ua',        // 自定义 User-Agent
  headers: { 'X-Custom': 'v' }, // 自定义请求头
})
```

**返回值：** `FetchArticleResult`

```typescript
// 成功
{
  ok: true,
  article: {
    platform: 'wechat',
    url: 'https://mp.weixin.qq.com/s/xxxxx',
    title: '文章标题',
    author: '作者',
    publishTime: '2023-07-30',
    contentHtml: '<div>...</div>',
    contentText: '纯文本内容',
    markdown: '# 标题\n\n正文...',
    metadata: {},
    fetchedAt: '2023-07-30T12:34:56.000Z',
    warnings: [],
  },
  artifacts: [
    { type: 'markdown', path: 'articles/文章标题_1627834567.md' }
  ],
  warnings: [],
}

// 失败
{
  ok: false,
  error: {
    code: 'NETWORK_ERROR',
    message: '请求失败: ...',
    retryable: true,
  }
}
```

### `fetchAlbum(input)`

批量获取微信专辑文章。

```typescript
import { fetchAlbum } from 'wespy-ts'

const result = await fetchAlbum({
  url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=...',
  outputDir: './output',
  format: ['markdown'],
  maxArticles: 10,               // 最大下载数，默认 10
  timeoutMs: 30000,
  downloadImages: false,
})
```

**返回值：** `FetchAlbumResult`

```typescript
// 成功
{
  ok: true,
  articles: [/* ArticleDraft[] */],
  artifacts: [/* OutputArtifact[] */],
  warnings: [],
  summaryFile: 'articles/album_1703980800_summary.json',
  failedCount: 0,
}

// 失败
{
  ok: false,
  error: { code: string, message: string, retryable: boolean }
}
```

### `fetchAlbumList(input)`

仅获取专辑文章列表，不下载内容。

```typescript
import { fetchAlbumList } from 'wespy-ts'

const result = await fetchAlbumList({
  url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=...&album_id=...',
  maxArticles: 20,
  timeoutMs: 30000,
})
```

**返回值：** `FetchAlbumListResult`

```typescript
// 成功
{
  ok: true,
  articles: [
    {
      title: '文章标题',
      url: 'http://mp.weixin.qq.com/s?__biz=...',
      msgid: '...',
      createTime: '1704067200',
      coverImg: '...',
      itemidx: '1',
      key: '...',
    }
  ],
  warnings: [],
}
```

### 错误码

| 错误码 | 说明 | 可重试 |
|--------|------|--------|
| `INVALID_INPUT` | 输入参数校验失败 | 否 |
| `UNSUPPORTED_URL` | 不支持的 URL 格式 | 否 |
| `NETWORK_ERROR` | 网络请求失败 | 是 |
| `HTTP_STATUS_ERROR` | HTTP 状态码异常 | 视情况 |
| `PARSE_EMPTY` | 解析结果为空 | 否 |
| `TIMEOUT` | 请求超时 | 是 |
| `FILE_SYSTEM_ERROR` | 文件系统错误 | 否 |
| `UNKNOWN_ERROR` | 未知错误 | 否 |

## 项目结构

```
src/
├── index.ts                              # SDK 入口，导出公共 API
├── cli/
│   └── main.ts                           # CLI 入口（commander）
├── core/
│   ├── types.ts                          # 核心类型定义 + Zod Schema
│   ├── errors.ts                         # 错误工厂函数
│   └── result.ts                         # Result<T> 类型工具
├── fetcher/
│   └── http-client.ts                    # HTTP 客户端（fetch + 编码检测）
├── platforms/
│   ├── detector.ts                       # URL 平台检测
│   ├── wechat/
│   │   ├── wechat-article.extractor.ts   # 微信文章提取器
│   │   ├── wechat-album.extractor.ts     # 微信专辑提取器
│   │   └── wechat.types.ts              # 微信类型定义
│   ├── juejin/
│   │   ├── juejin-article.extractor.ts   # 掘金文章提取器
│   │   └── juejin.types.ts             # 掘金类型定义
│   └── generic/
│       └── generic-article.extractor.ts  # 通用网页提取器
├── sdk/
│   ├── fetch-article.ts                  # fetchArticle() SDK 函数
│   ├── fetch-album.ts                    # fetchAlbum() SDK 函数
│   └── fetch-album-list.ts              # fetchAlbumList() SDK 函数
├── converter/
│   ├── html-to-markdown.ts              # HTML → Markdown 转换
│   └── sanitize-html.ts                 # HTML 清理
└── utils/
    ├── url.ts                            # URL 工具函数
    ├── fs.ts                             # 文件系统工具
    └── text.ts                           # 文本工具函数
```

## 开发

### 环境要求

- Node.js >= 18
- npm >= 8

### 开发环境设置

```bash
git clone https://github.com/Cuimc/WeSpy-TS.git
cd WeSpy-TS
npm install
```

### 常用命令

```bash
npm run build       # 编译 TypeScript
npm run dev         # watch 模式（开发时自动编译）
npm test            # 运行测试
npm run test:watch  # watch 模式运行测试
npm run lint        # 类型检查
npm run clean       # 清除编译产物
```

### 运行测试

```bash
npm test
```

## 依赖说明

| 依赖 | 用途 |
|------|------|
| `cheerio` | HTML 解析 |
| `commander` | CLI 框架 |
| `turndown` | HTML → Markdown 转换 |
| `undici` | HTTP 请求 |
| `zod` | 输入参数校验 |
| `vitest` | 测试框架（开发依赖） |
| `typescript` | TypeScript 编译器（开发依赖） |

## 与 Python 版的关系

本项目由 Python 版 [WeSpy](https://github.com/tianchangNorth/WeSpy) 重构而来：

- **保留了所有核心功能**：文章抓取、专辑下载、多格式输出、交互模式等
- **改进了架构设计**：分层架构（CLI → SDK → Extractor → HTTP），消除重复代码
- **增强了类型安全**：完整的 TypeScript 类型定义，Zod 输入校验
- **优化了错误处理**：结构化错误模型，7 种错误码，Result 返回类型

Python 原版代码保留在 `../WeSpy/` 目录中，未被删除。详见 [MIGRATION.md](./MIGRATION.md)。

## 常见问题

### Q: 为什么有些图片无法显示？

A: WeSpy-TS 使用 images.weserv.nl 作为代理服务来解决图片防盗链问题。如果仍然无法显示，可能是原图片已被删除或网络问题。

### Q: 支持哪些网站？

A: WeSpy-TS 对微信公众号和掘金有特别优化，对大部分使用标准 HTML 结构的网站都有较好的支持。如果某个网站不支持，欢迎提交 issue。

### Q: 如何在自己的项目中使用？

A: 安装为依赖后，通过 `import { fetchArticle } from 'wespy-ts'` 引入即可。所有 API 返回结构化结果，不会抛出异常，详见上方 SDK API 参考。

### Q: 与 Python 版有什么区别？

A: TypeScript 版提供了完整的类型定义、结构化错误处理、Zod 输入校验，并且既可以作为 CLI 工具也可以作为 SDK 使用。核心功能与 Python 版一致。详见 [MIGRATION.md](./MIGRATION.md)。

## 贡献

欢迎提交 issue 和 pull request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目使用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 更新日志

### v1.0.0 (2026-06-09)

- **🎉 TypeScript 重构发布**：由 Python 版 WeSpy 完整重构为 TypeScript
- **📦 npm 发布**：支持 `npm install -g wespy-ts` 全局安装
- **🔧 双模使用**：支持 CLI 命令行和 SDK API 两种使用方式
- **🎵 专辑功能完整迁移**：支持微信公众号专辑批量下载、仅列表获取
- **📝 多格式输出**：支持 Markdown、HTML、JSON 三种输出格式
- **🔒 类型安全**：完整的 TypeScript 类型定义，Zod 输入校验
- **🏗️ 分层架构**：CLI → SDK → Platform Extractor → HTTP Client 清晰分层
- **⚠️ 结构化错误**：7 种错误码，Result 返回类型，不依赖异常
- **🌐 多平台支持**：微信公众号、掘金、通用网页
- **🧪 测试覆盖**：提供完整的单元测试和 fixture

## 联系方式

- GitHub: [https://github.com/Cuimc/WeSpy-TS](https://github.com/Cuimc/WeSpy-TS)
- Issues: [https://github.com/Cuimc/WeSpy-TS/issues](https://github.com/Cuimc/WeSpy-TS/issues)
- npm: [https://www.npmjs.com/package/wespy-ts](https://www.npmjs.com/package/wespy-ts)

## 免责声明

本项目仅供学习和研究目的使用。使用本工具时，请务必遵守以下原则：

### 使用责任

- 用户需自行承担使用本工具的所有风险和责任
- 请确保您的使用行为符合目标网站的 robots.txt 文件要求
- 尊重内容创作者的知识产权，不得用于商业目的
- 不要对网站服务器造成过大的访问压力

### 法律合规

- 请遵守当地法律法规以及目标网站的使用条款
- 不得将本工具用于任何非法或未经授权的活动
- 下载的内容应仅用于个人学习、研究或存档目的

### 技术风险

- 网站结构可能随时变化，本工具可能无法正常工作
- 本工具按"原样"提供，不提供任何明示或暗示的保证
- 开发者不对因使用本工具造成的任何损失承担责任

### 数据安全

- 本工具不会收集或上传您的任何个人信息
- 所有数据处理都在本地完成
- 请妥善保管您下载的内容

---

**重要提醒**：请合理、合法、负责任地使用本工具，尊重网络服务提供者和内容创作者的权益。
