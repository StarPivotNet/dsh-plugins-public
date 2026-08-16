import { formatReloadFinished } from '../host/reload.ts'
import type { ReloadProgress } from './ReloadProgressToast.tsx'

export interface ReloadCardNode {
  readonly name: string | null
  readonly outcome: { readonly kind: 'success' | 'error'; readonly text?: string } | null
}

export function commandBody(text: string | undefined): string | null {
  if (text === undefined) return null
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return null
  const body = lines.slice(1).join('\n').replace(/^\n+/, '')
  return body.length > 0 ? body : null
}

export function sameReloadProgress(
  left: ReloadProgress | undefined,
  right: ReloadProgress | undefined,
): boolean {
  if (left === right) return true
  if (left === undefined || right === undefined) return false
  return left.phase === right.phase
    && left.current === right.current
    && left.index === right.index
    && left.total === right.total
    && left.ok === right.ok
    && left.failed === right.failed
    && left.message === right.message
}

function listedBody(text: string | undefined, names: readonly string[]): string | null {
  return commandBody(text) ?? (names.length > 0 ? names.join('\n') : null)
}

function finishedCopy(
  progress: ReloadProgress,
  body: string | null,
): { summary: string; body: string | null; state: 'ok' | 'error' } {
  const failed = progress.failed > 0 || progress.message.startsWith('后台重载失败')
  return {
    summary: progress.failed > 0 || progress.ok > 0
      ? formatReloadFinished(progress.ok, progress.failed)
      : (progress.message.split('\n')[0] ?? formatReloadFinished(0, 1)),
    body: body ?? commandBody(progress.message),
    state: failed ? 'error' : 'ok',
  }
}

export function reloadCardCopy(
  node: ReloadCardNode,
  progress: ReloadProgress | undefined,
  names: readonly string[] = [],
): { summary: string; body: string | null; state: 'running' | 'ok' | 'error' } {
  const accepted = node.outcome?.text
  const body = listedBody(accepted, names)
  if (accepted !== undefined) {
    const summary = accepted.split('\n')[0]?.trimEnd() || '正在重载插件'
    const done = summary.startsWith('重载完成')
    if (progress?.phase === 'done' && !done) return finishedCopy(progress, body)
    return { summary, body, state: done ? 'ok' : 'running' }
  }
  if (progress?.phase === 'done') return finishedCopy(progress, body)
  return {
    summary: progress !== undefined && progress.total > 0
      ? `正在重载 ${String(progress.total)} 个插件`
      : '正在重载插件',
    body,
    state: 'running',
  }
}
