import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fetchArticle } from '../../src/sdk/fetch-article.js'

let server: Server | undefined

afterEach(async () => {
  if (!server) return
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
  server = undefined
})

function serveArticle(): Promise<string> {
  return new Promise((resolve) => {
    server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<html><head><title>测试文章</title></head><body><article>正文</article></body></html>')
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server!.address()
      if (typeof address === 'object' && address) {
        resolve(`http://127.0.0.1:${address.port}/article`)
      }
    })
  })
}

describe('fetchArticle SDK', () => {
  it('should classify file write failures as FILE_SYSTEM_ERROR', async () => {
    const url = await serveArticle()
    const tempDir = await mkdtemp(join(tmpdir(), 'wespy-'))
    const blocker = join(tempDir, 'not-a-directory')
    await writeFile(blocker, 'blocker')

    const result = await fetchArticle({
      url,
      outputDir: blocker,
      format: ['markdown'],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_SYSTEM_ERROR')
    }
  })

  it('should reject downloadImages instead of silently ignoring it', async () => {
    const result = await fetchArticle({
      url: 'https://example.com/article',
      downloadImages: true,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT')
    }
  })
})
