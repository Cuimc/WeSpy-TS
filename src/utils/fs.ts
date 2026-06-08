/**
 * 文件系统工具函数
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * 确保目录存在，不存在则递归创建
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

/**
 * 写入文件，自动创建父目录
 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath))
  await writeFile(filePath, content, 'utf-8')
}

/**
 * 写入 JSON 文件，自动创建父目录
 */
export async function writeJsonSafe(
  filePath: string,
  data: unknown,
  pretty = true,
): Promise<void> {
  const content = JSON.stringify(data, null, pretty ? 2 : undefined)
  await writeFileSafe(filePath, content)
}
