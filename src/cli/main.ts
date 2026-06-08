#!/usr/bin/env node
/**
 * WeSpy CLI 入口
 * 使用 commander 实现，调用 SDK API
 */

import { createInterface } from 'node:readline'
import { Command } from 'commander'
import { fetchArticle } from '../sdk/fetch-article.js'
import { fetchAlbum } from '../sdk/fetch-album.js'
import { fetchAlbumList } from '../sdk/fetch-album-list.js'
import { isWechatAlbumUrl } from '../platforms/detector.js'
import type { OutputFormat } from '../core/types.js'
import { writeJsonSafe, ensureDir } from '../utils/fs.js'
import { join } from 'node:path'

// ── 公共选项 ──────────────────────────────────────────────

interface CliOptions {
  output: string
  html: boolean
  json: boolean
  all: boolean
  max: string
  timeout: string
  verbose: boolean
  downloadImages: boolean
  albumOnly?: boolean
}

function addCommonOptions(cmd: Command): Command {
  return cmd
    .option('-o, --output <dir>', '输出目录', 'articles')
    .option('--html', '同时保存 HTML 文件')
    .option('--json', '同时保存 JSON 文件')
    .option('--all', '保存所有格式 (HTML + JSON + Markdown)')
    .option('--download-images', '下载图片到本地（当前迁移版本暂未实现）')
    .option('--timeout <ms>', '请求超时时间 (毫秒)', '30000')
    .option('-v, --verbose', '显示详细信息')
}

/** 打印文章信息，缺失字段不显示 */
function printArticleInfo(article: { title: string; author?: string; publishTime?: string }): void {
  console.log(`   标题: ${article.title}`)
  if (article.author) console.log(`   作者: ${article.author}`)
  if (article.publishTime) console.log(`   时间: ${article.publishTime}`)
}

function resolveFormats(options: CliOptions): OutputFormat[] {
  if (options.all) return ['markdown', 'html', 'json']
  const formats: OutputFormat[] = ['markdown']
  if (options.html) formats.push('html')
  if (options.json) formats.push('json')
  return formats
}

function printVerbose(options: CliOptions, url: string, extra?: Record<string, unknown>): void {
  const formats = resolveFormats(options)
  console.log('\n[verbose] 配置信息:')
  console.log(`  URL: ${url}`)
  console.log(`  输出目录: ${options.output}`)
  console.log(`  输出格式: HTML=${formats.includes('html')}, JSON=${formats.includes('json')}, Markdown=${formats.includes('markdown')}`)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      console.log(`  ${k}: ${v}`)
    }
  }
}

// ── 交互模式 ──────────────────────────────────────────────

async function promptInput(question: string, defaultVal: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultVal)
    })
  })
}

async function runInteractiveMode(): Promise<void> {
  console.log('文章获取工具')
  console.log('='.repeat(40))

  const url = await promptInput('请输入文章 URL: ', '')
  if (!url) {
    console.error('URL 不能为空!')
    process.exit(1)
  }

  const outputDir = await promptInput("输出目录 (回车使用默认 'articles'): ", 'articles')

  console.log('\n输出格式选择:')
  console.log('1. 仅 Markdown (默认)')
  console.log('2. Markdown + HTML')
  console.log('3. Markdown + JSON')
  console.log('4. 全部格式 (HTML + JSON + Markdown)')

  const choice = await promptInput('请选择 (1-4, 回车使用默认1): ', '1')

  let formats: OutputFormat[] = ['markdown']
  if (choice === '2') formats = ['markdown', 'html']
  else if (choice === '3') formats = ['markdown', 'json']
  else if (choice === '4') formats = ['markdown', 'html', 'json']

  const maxArticles = 10

  // 执行
  if (isWechatAlbumUrl(url)) {
    console.log('\n检测到微信专辑 URL，将批量下载...')
    const result = await fetchAlbum({
      url,
      outputDir,
      format: formats,
      maxArticles,
      timeoutMs: 30000,
      downloadImages: false,
    })
    if (result.ok) {
      console.log(`\n✅ 批量下载完成! 成功: ${result.articles.length} 篇`)
    } else {
      console.error(`\n❌ ${result.error.message}`)
      process.exit(1)
    }
  } else {
    const result = await fetchArticle({ url, outputDir, format: formats, timeoutMs: 30000, downloadImages: false })
    if (result.ok) {
      if ('article' in result) {
        console.log('\n✅ 成功获取文章!')
        printArticleInfo(result.article)
      } else {
        console.log('\n✅ 批量下载完成!')
        console.log(`   成功: ${result.articles.length} 篇`)
        if (result.failedCount) console.log(`   失败: ${result.failedCount} 篇`)
      }
      if (result.artifacts.length > 0) {
        console.log('   产物:')
        for (const a of result.artifacts) {
          console.log(`     - [${a.type}] ${a.path}`)
        }
      }
    } else {
      console.error(`\n❌ 获取失败: ${result.error.message}`)
      process.exit(1)
    }
  }
}

// ── album-only 处理 ──────────────────────────────────────

async function handleAlbumOnly(url: string, options: CliOptions): Promise<void> {
  const maxArticles = parseInt(options.max, 10)
  const timeoutMs = parseInt(options.timeout, 10)

  console.log('仅获取专辑文章列表...')

  // 使用 fetchAlbumList —— 仅 API 列表，不下载文章（与 Python 一致）
  const result = await fetchAlbumList({ url, maxArticles, timeoutMs })

  if (result.ok) {
    console.log(`\n获取到 ${result.articles.length} 篇文章:`)
    for (let i = 0; i < result.articles.length; i++) {
      const a = result.articles[i]!
      console.log(`${String(i + 1).padStart(2)}. ${a.title}`)
      console.log(`     URL: ${a.url}`)
      if (a.createTime) console.log(`     时间: ${a.createTime}`)
      if (i < result.articles.length - 1) console.log()
    }

    // 保存文章列表到 JSON（包含完整元数据，与 Python 一致）
    await ensureDir(options.output)
    const listFile = join(options.output, `album_articles_${Math.floor(Date.now() / 1000)}.json`)
    await writeJsonSafe(listFile, result.articles)
    console.log(`\n文章列表已保存到: ${listFile}`)
  } else {
    console.error(`\n❌ 获取失败: ${result.error.message}`)
    process.exit(1)
  }
}

// ── album 批量下载处理 ────────────────────────────────────

async function handleAlbumDownload(url: string, options: CliOptions, formats: OutputFormat[]): Promise<void> {
  const maxArticles = parseInt(options.max, 10)
  const timeoutMs = parseInt(options.timeout, 10)

  console.log('检测到微信专辑 URL，将批量下载...')
  const result = await fetchAlbum({
    url,
    outputDir: options.output,
    format: formats,
    maxArticles,
    timeoutMs,
    downloadImages: options.downloadImages,
  })

  if (result.ok) {
    const failed = result.failedCount ?? 0
    console.log(`\n✅ 批量下载完成!`)
    console.log(`   成功: ${result.articles.length} 篇`)
    if (failed > 0) console.log(`   失败: ${failed} 篇`)
    console.log(`   文章保存在: ${options.output}`)
    if (result.summaryFile) {
      console.log(`   汇总: ${result.summaryFile}`)
    }
  } else {
    console.error(`\n❌ 下载失败: ${result.error.message}`)
    process.exit(1)
  }
}

// ── CLI 程序 ──────────────────────────────────────────────

const program = new Command()

program
  .name('wespy')
  .description('文章抓取与 Markdown 转换工具')
  .version('0.2.0')

// ── fetch-article 子命令 ──────────────────────────────────

addCommonOptions(
  program
    .command('fetch-article')
    .description('获取单篇文章')
    .argument('<url>', '文章 URL'),
).action(async (url: string, options: CliOptions) => {
  const formats = resolveFormats(options)
  const timeoutMs = parseInt(options.timeout, 10)

  if (options.verbose) {
    printVerbose(options, url)
  }

  const result = await fetchArticle({
    url,
    outputDir: options.output,
    format: formats,
    timeoutMs,
    downloadImages: options.downloadImages,
  })

  if (result.ok) {
    if ('article' in result) {
      console.log('\n✅ 成功获取文章!')
      printArticleInfo(result.article)
    } else {
      console.log('\n✅ 批量下载完成!')
      console.log(`   成功: ${result.articles.length} 篇`)
      if (result.failedCount) console.log(`   失败: ${result.failedCount} 篇`)
    }
    if (result.artifacts.length > 0) {
      console.log('   产物:')
      for (const a of result.artifacts) {
        console.log(`     - [${a.type}] ${a.path}`)
      }
    }
  } else {
    console.error(`\n❌ 获取失败: ${result.error.message}`)
    console.error(`   错误码: ${result.error.code}`)
    process.exit(1)
  }
})

// ── fetch-album 子命令 ────────────────────────────────────

addCommonOptions(
  program
    .command('fetch-album')
    .description('批量获取微信专辑文章')
    .argument('<url>', '专辑 URL')
    .option('--max <n>', '最大下载文章数', '10')
    .option('--album-only', '仅获取文章列表，不下载内容'),
).action(async (url: string, options: CliOptions) => {
  if (options.verbose) {
    printVerbose(options, url, {
      最大文章数量: parseInt(options.max, 10),
      仅获取列表: options.albumOnly ?? false,
    })
  }

  if (options.albumOnly) {
    await handleAlbumOnly(url, options)
    return
  }

  const formats = resolveFormats(options)
  await handleAlbumDownload(url, options, formats)
})

// ── 默认命令（智能判断 URL 类型）──────────────────────────

addCommonOptions(
  program
    .argument('[url]', '文章或专辑 URL')
    .option('--max <n>', '专辑最大下载文章数', '10')
    .option('--album-only', '仅获取文章列表，不下载内容'),
).action(async (url: string | undefined, options: CliOptions) => {
  // 无 URL → 交互模式
  if (!url) {
    await runInteractiveMode()
    return
  }

  const formats = resolveFormats(options)
  const timeoutMs = parseInt(options.timeout, 10)
  const maxArticles = parseInt(options.max, 10)

  if (options.verbose) {
    printVerbose(options, url, { 最大文章数量: maxArticles, 仅获取列表: options.albumOnly ?? false })
  }

  if (isWechatAlbumUrl(url)) {
    if (options.albumOnly) {
      await handleAlbumOnly(url, options)
      return
    }
    await handleAlbumDownload(url, options, formats)
  } else {
    const result = await fetchArticle({
      url,
      outputDir: options.output,
      format: formats,
      timeoutMs,
      downloadImages: options.downloadImages,
    })

    if (result.ok) {
      if ('article' in result) {
        console.log('\n✅ 成功获取文章!')
        printArticleInfo(result.article)
      } else {
        console.log('\n✅ 批量下载完成!')
        console.log(`   成功: ${result.articles.length} 篇`)
        if (result.failedCount) console.log(`   失败: ${result.failedCount} 篇`)
      }
    } else {
      console.error(`\n❌ ${result.error.message}`)
      process.exit(1)
    }
  }
})

program.parse()
