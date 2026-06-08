# WeSpy 迁移说明

## 迁移状态

**阶段**: 阶段 1-7 已完成（项目分析 → 项目骨架 → 类型 → HTTP → 解析 → 输出 → CLI → 测试）

## Python → TypeScript 功能对照

| Python 功能 | Python 文件 | TypeScript 文件 | 状态 |
|-------------|------------|----------------|------|
| 微信文章抓取 | `main.py:_fetch_wechat_article` | `platforms/wechat/wechat-article.extractor.ts` | ✅ |
| 微信专辑抓取 | `main.py:WeChatAlbumFetcher` | `platforms/wechat/wechat-album.extractor.ts` | ✅ |
| 掘金文章抓取 | `juejin.py:JuejinFetcher` | `platforms/juejin/juejin-article.extractor.ts` | ✅ |
| 通用网页抓取 | `main.py:_fetch_general_article` | `platforms/generic/generic-article.extractor.ts` | ✅ |
| HTML→Markdown | `main.py:_html_to_markdown_recursive` (重复) | `converter/html-to-markdown.ts` (单一实现) | ✅ |
| 代码语言检测 | `main.py:_detect_code_language` (重复) | `utils/text.ts:detectCodeLanguage` | ✅ |
| 图片代理 | `main.py:_get_proxy_image_url` (重复) | `utils/url.ts:buildProxyImageUrl` | ✅ |
| 文件保存 | `main.py:_save_article` (重复) | 各 extractor 内的 `saveArtifacts` | ✅ |
| CLI | `main.py:main()` | `cli/main.ts` (commander) | ✅ |
| 错误处理 | 无分类 | `core/errors.ts` (7 种错误码) | ✅ 改进 |
| 数据模型 | 无 (plain dict) | `core/types.ts` (zod + interface) | ✅ 改进 |
| SDK API | 无 | `sdk/fetch-article.ts`, `sdk/fetch-album.ts` | ✅ 新增 |

## 架构改进

### 消除代码重复

Python 版 `main.py` 和 `juejin.py` 之间有 **300+ 行完全重复** 的代码：
- `_save_article()` — 完全相同
- `_convert_to_markdown()` — 完全相同
- `_html_to_markdown_recursive()` — 完全相同
- `_convert_list_to_markdown()` — 完全相同
- `_extract_code_from_pre()` — 完全相同
- `_detect_code_language()` — 完全相同（含 30 条语言映射）
- `_get_proxy_image_url()` — 完全相同

TypeScript 版将这些全部提取到共享模块：
- `converter/html-to-markdown.ts` — 统一的 HTML→Markdown 转换
- `utils/text.ts` — 语言检测、代码清理、文件名清理
- `utils/url.ts` — 图片代理 URL 构建

### 分层架构

```
CLI 层 ──→ SDK API ──→ 平台提取器 ──→ HTTP 客户端
                        ↓
                   HTML 解析 / 转换
                        ↓
                   文件写入（解耦）
```

- **CLI 层**只负责参数解析和人类可读输出
- **SDK API**返回结构化结果（Result 类型）
- **平台提取器**各自独立，不互相依赖
- **文件写入**与解析逻辑分离

### 错误模型

Python 版只有 `try/except + print`。TypeScript 版定义了 7 种错误码：

| 错误码 | 含义 | 可重试 |
|--------|------|--------|
| `INVALID_INPUT` | 输入参数无效 | 否 |
| `UNSUPPORTED_URL` | 不支持的 URL | 否 |
| `NETWORK_ERROR` | 网络错误 | 是 |
| `HTTP_STATUS_ERROR` | HTTP 状态码错误 | 5xx/429 可重试 |
| `PARSE_EMPTY` | 解析内容为空 | 否 |
| `TIMEOUT` | 请求超时 | 是 |
| `FILE_SYSTEM_ERROR` | 文件系统错误 | 否 |

## 依赖对照

| Python | TypeScript | 用途 |
|--------|-----------|------|
| `requests` | `undici` | HTTP 请求 |
| `beautifulsoup4` | `cheerio` | HTML 解析 |
| (手写递归) | `turndown` (备用) | HTML→Markdown |
| `argparse` | `commander` | CLI |
| (无) | `zod` | 输入校验 |

## 未迁移功能

以下功能尚未实现：

1. **图片下载** — `downloadImages` 参数已预留，实际下载逻辑未实现（Python 版也没有此功能）

## Python 代码保留

Python 原版代码保留在 `../WeSpy/` 目录中，**未被删除**。在 TypeScript 版核心能力完全稳定之前，Python 代码继续可用。
