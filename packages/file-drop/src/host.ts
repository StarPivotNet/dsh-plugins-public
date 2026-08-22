/**
 * Host half of file-drop. Stages browser File blobs that have no local path
 * under ~/.dsh/dropped so the composer can insert a real filesystem path.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_MAX_STAGE_BYTES, safeDroppedName } from './logic.ts'

export const name = 'file-drop'
export const CHANNEL = '/file-drop'

export interface Config {
  maxStageBytes?: number
  stageDir?: string
}

interface StagePayload {
  name?: string
  mediaType?: string
  data?: string
}

/** Absolute staging directory for dropped files without a Finder path. */
export function defaultStageDir(): string {
  return join(homedir(), '.dsh', 'dropped')
}

/** Decode a browser File as base64 into a unique path under stageDir. */
export async function stageDroppedFile(
  payload: StagePayload,
  options: { maxStageBytes: number; stageDir: string },
): Promise<{ path: string }> {
  const data = payload.data
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('file-drop.stage: missing data')
  }
  let bytes: Buffer
  try {
    bytes = Buffer.from(data, 'base64')
  } catch {
    throw new Error('file-drop.stage: data is not base64')
  }
  if (bytes.byteLength === 0) throw new Error('file-drop.stage: empty file')
  if (bytes.byteLength > options.maxStageBytes) {
    throw new Error(`file-drop.stage: file exceeds ${String(options.maxStageBytes)} bytes`)
  }
  const name = safeDroppedName(typeof payload.name === 'string' ? payload.name : 'dropped.bin')
  const dest = join(options.stageDir, `${randomUUID()}-${name}`)
  await mkdir(options.stageDir, { recursive: true })
  await writeFile(dest, bytes)
  return { path: dest }
}

export function apply(ctx: Context, config: Config = {}): void {
  const maxStageBytes = config.maxStageBytes ?? DEFAULT_MAX_STAGE_BYTES
  const stageDir = config.stageDir ?? defaultStageDir()
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        if (endpoint !== 'stage') {
          return { ok: false, error: { code: 'NOT_FOUND', message: 'unknown file-drop endpoint' } }
        }
        const value = await stageDroppedFile(payload as StagePayload, { maxStageBytes, stageDir })
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
