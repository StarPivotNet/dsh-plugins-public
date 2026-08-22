/**
 * Host half of file-drop. Stages browser File blobs that have no local path
 * under ~/.dsh/dropped so the composer can insert a real filesystem path.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_BRIEF_BYTES, DEFAULT_MAX_STAGE_BYTES, safeDroppedName } from './logic.ts'

export const name = 'file-drop'
export const CHANNEL = '/file-drop'

export interface Config {
  maxStageBytes?: number
  briefBytes?: number
  stageDir?: string
}

interface StagePayload {
  name?: string
  mediaType?: string
  data?: string
  size?: number
}

export interface StageResult {
  path?: string
  name: string
  size?: number
  tooLarge?: boolean
  staged?: boolean
}

/** Absolute staging directory for dropped files without a Finder path. */
export function defaultStageDir(): string {
  return join(homedir(), '.dsh', 'dropped')
}

/** Decode a browser File as base64 into a unique path under stageDir. */
export async function stageDroppedFile(
  payload: StagePayload,
  options: { maxStageBytes: number; briefBytes: number; stageDir: string },
): Promise<StageResult> {
  const name = typeof payload.name === 'string' && payload.name.length > 0 ? payload.name : 'dropped.bin'
  const declared = typeof payload.size === 'number' ? payload.size : undefined
  if (declared !== undefined && declared >= options.briefBytes) {
    return { name, size: declared, tooLarge: true }
  }
  const data = payload.data
  if (typeof data !== 'string' || data.length === 0) {
    if (declared !== undefined) return { name, size: declared, tooLarge: declared >= options.briefBytes }
    throw new Error('file-drop.stage: missing data')
  }
  let bytes: Buffer
  try {
    bytes = Buffer.from(data, 'base64')
  } catch {
    throw new Error('file-drop.stage: data is not base64')
  }
  if (bytes.byteLength === 0) throw new Error('file-drop.stage: empty file')
  if (bytes.byteLength >= options.briefBytes || bytes.byteLength > options.maxStageBytes) {
    return { name, size: bytes.byteLength, tooLarge: true }
  }
  const dest = join(options.stageDir, `${randomUUID()}-${safeDroppedName(name)}`)
  await mkdir(options.stageDir, { recursive: true })
  await writeFile(dest, bytes)
  return { path: dest, name, size: bytes.byteLength, staged: true }
}

export function apply(ctx: Context, config: Config = {}): void {
  const maxStageBytes = config.maxStageBytes ?? DEFAULT_MAX_STAGE_BYTES
  const briefBytes = config.briefBytes ?? DEFAULT_BRIEF_BYTES
  const stageDir = config.stageDir ?? defaultStageDir()
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        if (endpoint !== 'stage') {
          return { ok: false, error: { code: 'NOT_FOUND', message: 'unknown file-drop endpoint' } }
        }
        const value = await stageDroppedFile(payload as StagePayload, { maxStageBytes, briefBytes, stageDir })
        return { ok: true, value }
      } catch (error) {
        return {
          ok: false,
          error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) },
        }
      }
    }, { authority: 'loopback' })
  })
}
