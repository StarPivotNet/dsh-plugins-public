/** Out-of-tree Settings page for importing foreign AI sessions. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { SessionImportSection, type SessionImportSectionInjected } from './SessionImportSection.tsx'
import { en, zh } from './locales.ts'

export const NS = 'settings.sessionImport'
export const inject = ['slots', 'locale', 'connection']

type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

function sessionImportCaller(ctx: ClientContext): <T>(method: string, body?: unknown) => Promise<T> {
  const rpc = (ctx.get('connection') as {
    rpc: { call: (channel: string, endpoint: string, payload: unknown) => Promise<RpcResult<unknown>> }
  }).rpc
  return async <T,>(method: string, body?: unknown): Promise<T> => {
    const payload = await rpc.call('/session-import', method, body ?? {})
    if (!payload.ok) {
      throw new Error('sessionImport.' + method + ' failed: ' + payload.error.message)
    }
    return payload.value as T
  }
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-import: dictionaries')
  const call = sessionImportCaller(ctx)
  const injected = (): SessionImportSectionInjected => ({
    listSessions: source => call('listSessions', source === undefined ? {} : { source }),
    importSessions: paths => call('importSessions', { paths }),
    listSkills: () => call('listSkills'),
    importSkills: paths => call('importSkills', { paths }),
  })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'session-import',
    order: 16,
    label: () => ctx.locale.bind(NS)('nav'),
    locale: NS,
    inject: injected,
  }, SessionImportSection))
}
