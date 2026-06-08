import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { HttpClient } from '../../src/fetcher/http-client.js'

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

function listen(): Promise<string> {
  return new Promise((resolve) => {
    server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.write('partial')
      setTimeout(() => res.end('done'), 200)
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server!.address()
      if (typeof address === 'object' && address) {
        resolve(`http://127.0.0.1:${address.port}/slow`)
      }
    })
  })
}

describe('HttpClient', () => {
  it('should apply timeout while reading response body', async () => {
    const url = await listen()
    const client = new HttpClient({ timeoutMs: 50 })

    const result = await client.get(url)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('TIMEOUT')
    }
  })
})
