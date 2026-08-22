/** Browser plugin entry: capture-phase file-drop interceptor. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { installFileDropInterceptor, type FileDropRpc } from './client.ts'

export const inject = ['connection']

const zh = {
  title: '拖入文件即可插入路径',
  desc: '图片仍作为附件；其它文件写入输入框，没有本机路径时会先存到 ~/.dsh/dropped',
}

const en = {
  title: 'Drop files to insert their paths',
  desc: 'Images stay attachments. Other files are inserted as paths; files without a local path are staged under ~/.dsh/dropped.',
}

type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

function fileDropRpc(ctx: ClientContext): FileDropRpc {
  const rpc = (ctx.get('connection') as {
    rpc: { call: (channel: string, endpoint: string, payload: unknown) => Promise<RpcResult<{ path: string }>> }
  }).rpc
  return rpc
}

function localeOf(): { title: string; desc: string } {
  const lang = typeof navigator === 'undefined' ? 'en' : navigator.language
  return lang.toLowerCase().startsWith('zh') ? zh : en
}

export function apply(ctx: ClientContext): void {
  const rpc = fileDropRpc(ctx)
  ctx.effect(() => installFileDropInterceptor({
    rpc,
    labels: localeOf(),
  }), 'file-drop interceptor')
}
