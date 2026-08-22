/** Browser plugin entry: capture-phase file-drop interceptor. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { installFileDropInterceptor, type FileDropRpc } from './client.ts'

export const inject = ['connection']

const zh = {
  title: '拖入文件即可插入路径',
  desc: '图片仍作为附件；其它任意文件写入路径。超过 256KB 只插入简要信息，不读完整内容',
}

const en = {
  title: 'Drop files to insert their paths',
  desc: 'Images stay attachments. Any other file inserts a path. Files over 256KB insert a brief summary only.',
}

function fileDropRpc(ctx: ClientContext): FileDropRpc {
  const rpc = (ctx.get('connection') as { rpc: FileDropRpc }).rpc
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
