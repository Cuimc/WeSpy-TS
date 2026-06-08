/**
 * WeSpy SDK 完整测试用例
 *
 * 运行: npx tsx examples/sdk-test.ts
 */

import { fetchArticle, fetchAlbum, detectPlatform, isWechatUrl } from '../src/index.js'

async function runTests() {
  let passed = 0
  let failed = 0

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
      failed++
    }
  }

  console.log('=== WeSpy SDK 测试用例 ===\n')

  // ── 测试 1: 平台检测 ──
  console.log('【测试 1】平台检测')
  assert('微信文章 URL', detectPlatform('https://mp.weixin.qq.com/s/xxx') === 'wechat')
  assert('微信专辑 URL', detectPlatform('https://mp.weixin.qq.com/mp/appmsgalbum?__biz=x') === 'wechat-album')
  assert('掘金 URL', detectPlatform('https://juejin.cn/post/123') === 'juejin')
  assert('通用 URL', detectPlatform('https://example.com') === 'generic')
  assert('isWechatUrl 辅助函数', isWechatUrl('https://mp.weixin.qq.com/s/xxx') === true)
  assert('isWechatUrl 非微信', isWechatUrl('https://example.com') === false)

  // ── 测试 2: 输入校验 — 无效 URL ──
  console.log('\n【测试 2】输入校验 — 无效 URL')
  const r1 = await fetchArticle({ url: 'not-a-valid-url' })
  assert('ok 为 false', r1.ok === false)
  assert('错误码为 INVALID_INPUT', !r1.ok && r1.error.code === 'INVALID_INPUT')
  assert('retryable 为 false', !r1.ok && r1.error.retryable === false)

  // ── 测试 3: 专辑 URL 误用 fetchArticle ──
  console.log('\n【测试 3】专辑 URL 误用 fetchArticle')
  const r2 = await fetchArticle({
    url: 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=x&action=getalbum',
  })
  assert('ok 为 false', r2.ok === false)
  assert('错误码为 UNSUPPORTED_URL', !r2.ok && r2.error.code === 'UNSUPPORTED_URL')
  assert('提示使用 fetchAlbum', !r2.ok && r2.error.message.includes('fetchAlbum'))

  // ── 测试 4: fetchAlbum 非专辑 URL ──
  console.log('\n【测试 4】fetchAlbum 非专辑 URL')
  const r3 = await fetchAlbum({ url: 'https://example.com' })
  assert('ok 为 false', r3.ok === false)
  assert('错误码为 UNSUPPORTED_URL', !r3.ok && r3.error.code === 'UNSUPPORTED_URL')

  // ── 测试 5: 真实请求 — 通用网页 ──
  console.log('\n【测试 5】真实请求 — 通用网页 (httpbin.org/html)')
  const r4 = await fetchArticle({
    url: 'https://example.com',
    outputDir: './output/test',
    format: ['markdown'],
    timeoutMs: 60000,
  })
  assert('ok 为 true', r4.ok === true)
  if (r4.ok) {
    assert('标题非空', r4.article.title.length > 0, `标题: ${r4.article.title}`)
    assert('platform 为 generic', r4.article.platform === 'generic')
    assert('markdown 非空', (r4.article.markdown ?? '').length > 0)
    assert('contentHtml 非空', (r4.article.contentHtml ?? '').length > 0)
    assert('fetchedAt 非空', r4.article.fetchedAt.length > 0)
    assert('artifacts 数量 > 0', r4.artifacts.length > 0)
    assert('warnings 为数组', Array.isArray(r4.warnings))
  }

  // ── 测试 6: 真实请求 — 带所有格式 ──
  console.log('\n【测试 6】真实请求 — 全格式输出')
  const r5 = await fetchArticle({
    url: 'https://example.com',
    outputDir: './output/test-all',
    format: ['markdown', 'json', 'html'],
    timeoutMs: 60000,
  })
  assert('ok 为 true', r5.ok === true)
  if (r5.ok) {
    assert('产物包含 markdown', r5.artifacts.some((a) => a.type === 'markdown'))
    assert('产物包含 json', r5.artifacts.some((a) => a.type === 'json'))
    assert('产物包含 html', r5.artifacts.some((a) => a.type === 'html'))
  }

  // ── 测试 7: 错误对象结构 ──
  console.log('\n【测试 7】错误对象结构')
  if (!r1.ok) {
    assert('有 code 字段', typeof r1.error.code === 'string')
    assert('有 message 字段', typeof r1.error.message === 'string')
    assert('有 retryable 字段', typeof r1.error.retryable === 'boolean')
  }

  // ── 汇总 ──
  console.log(`\n${'='.repeat(40)}`)
  console.log(`总计: ${passed + failed} 项, 通过: ${passed}, 失败: ${failed}`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
