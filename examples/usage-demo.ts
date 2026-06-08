/**
 * WeSpy SDK 使用示例
 *
 * 运行方式:
 *   npx tsx examples/usage-demo.ts
 */

import { fetchArticle } from '../src/index.js'

async function main() {
  console.log('=== WeSpy SDK 使用示例 ===\n')

  // 示例 1: 获取一篇微信公众号文章
  console.log('【示例 1】获取微信公众号文章')
  console.log('---')

  const wechatResult = await fetchArticle({
    url: 'https://mp.weixin.qq.com/s/DbDdJqF5v5Q2-eF5L3vXgA',
    outputDir: './output/wechat-demo',
    format: ['markdown', 'json'],
    timeoutMs: 15000,
  })

  if (wechatResult.ok) {
    console.log(`✅ 成功!`)
    console.log(`   标题: ${wechatResult.article.title}`)
    console.log(`   作者: ${wechatResult.article.author ?? '未知'}`)
    console.log(`   时间: ${wechatResult.article.publishTime ?? '未知'}`)
    console.log(`   正文前100字: ${(wechatResult.article.contentText ?? '').slice(0, 100)}...`)
    console.log(`   Markdown 前200字: ${(wechatResult.article.markdown ?? '').slice(0, 200)}...`)
    console.log(`   产物数量: ${wechatResult.artifacts.length}`)
    for (const a of wechatResult.artifacts) {
      console.log(`     - [${a.type}] ${a.path}`)
    }
  } else {
    console.log(`❌ 失败: ${wechatResult.error.code} — ${wechatResult.error.message}`)
    console.log(`   可重试: ${wechatResult.error.retryable}`)
  }

  // 示例 2: 获取一篇掘金文章
  console.log('\n【示例 2】获取掘金文章')
  console.log('---')

  const juejinResult = await fetchArticle({
    url: 'https://juejin.cn/post/7348981267141976100',
    outputDir: './output/juejin-demo',
    format: ['markdown', 'html', 'json'],
    timeoutMs: 15000,
  })

  if (juejinResult.ok) {
    console.log(`✅ 成功!`)
    console.log(`   标题: ${juejinResult.article.title}`)
    console.log(`   作者: ${juejinResult.article.author ?? '未知'}`)
    console.log(`   标签: ${(juejinResult.article.metadata['tags'] as string[])?.join(', ') ?? '无'}`)
    console.log(`   产物数量: ${juejinResult.artifacts.length}`)
  } else {
    console.log(`❌ 失败: ${juejinResult.error.code} — ${juejinResult.error.message}`)
  }

  // 示例 3: 错误处理 — 无效 URL
  console.log('\n【示例 3】错误处理 — 无效 URL')
  console.log('---')

  const invalidResult = await fetchArticle({
    url: 'not-a-valid-url',
    outputDir: './output',
  })

  if (!invalidResult.ok) {
    console.log(`✅ 正确捕获错误!`)
    console.log(`   错误码: ${invalidResult.error.code}`)
    console.log(`   错误信息: ${invalidResult.error.message}`)
    console.log(`   可重试: ${invalidResult.error.retryable}`)
  }

  // 示例 4: 错误处理 — 专辑 URL 用错 API
  console.log('\n【示例 4】错误处理 — 专辑 URL 用 fetchArticle')
  console.log('---')

  const albumAsArticle = await fetchArticle({
    url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI1MzYx&action=getalbum&album_id=123',
    outputDir: './output',
  })

  if (!albumAsArticle.ok) {
    console.log(`✅ 正确捕获错误!`)
    console.log(`   错误码: ${albumAsArticle.error.code}`)
    console.log(`   错误信息: ${albumAsArticle.error.message}`)
  }
}

main().catch(console.error)
