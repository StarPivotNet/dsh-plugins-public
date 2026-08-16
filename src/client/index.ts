/** Out-of-tree marketplace page. Mounts over the shipped Plugins settings section. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  MarketplaceSettingsSection,
  type MarketplaceMutationResult,
  type MarketplaceSettingsSectionInjected,
} from './MarketplaceSettingsSection.tsx'
import { en, zh } from './locales.ts'

export const NS = 'settings.pluginMarketplace'
export const inject = ['slots', 'locale', 'settingsScope', 'connection']

declare module '@deepseek-ai/cordis' {
  interface Context {
    pluginMarketplaceUi?: true
  }
}

type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

function marketplaceCaller(ctx: ClientContext): <T>(method: string, body?: unknown) => Promise<T> {
  const rpc = (ctx.get('connection') as {
    rpc: { call: (channel: string, endpoint: string, payload: unknown) => Promise<RpcResult<unknown>> }
  }).rpc
  return async <T,>(method: string, body?: unknown): Promise<T> => {
    const payload = await rpc.call('/plugin-marketplace', method, body ?? {})
    if (!payload.ok) {
      throw new Error('pluginMarketplace.' + method + ' failed: ' + payload.error.message)
    }
    return payload.value as T
  }
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'plugin-marketplace: dictionaries')
  ctx.provide('pluginMarketplaceUi', true)
  const t = ctx.locale.bind(NS)
  const catalogScope = ctx.settingsScope.bind<{ catalogUrls: string[]; reloadNonce: number }>({
    namespace: 'plugin-marketplace',
  })
  const callMarketplace = marketplaceCaller(ctx)
  let lastReloadNonce = catalogScope.getSnapshot().value?.reloadNonce ?? 0
  ctx.effect(() => catalogScope.subscribe(() => {
    const next = catalogScope.getSnapshot().value?.reloadNonce ?? lastReloadNonce
    if (next === lastReloadNonce) return
    lastReloadNonce = next
    void fetch('/plugins/reload', { method: 'POST' }).catch(() => {
      // The Host already finished /reload; a failed browser swap is visible in HMR logs.
    })
  }), 'plugin-marketplace: browser reload on nonce')

  const mutation = (value: { ok: true; restartRequired?: true } | { ok: false; message: string }): MarketplaceMutationResult => {
    if (!value.ok) return { ok: false, message: value.message }
    return value.restartRequired === true ? { ok: true, restartRequired: true } : { ok: true }
  }

  const injected = (): MarketplaceSettingsSectionInjected => ({
    listInstalled: () => callMarketplace('listInstalled'),
    listCatalog: () => callMarketplace('listCatalog'),
    install: async (name, version) => mutation(await callMarketplace(
      'install',
      version === undefined ? { name } : { name, version },
    )),
    uninstall: async (name) => mutation(await callMarketplace('uninstall', { name })),
    setEnabled: async (entryId, enabled) => mutation(await callMarketplace('setEnabled', { entryId, enabled })),
    catalogUrls: catalogScope.getSnapshot().value?.catalogUrls ?? [],
    setCatalogUrls: async (value) => { await catalogScope.set('catalogUrls', value) },
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'plugins',
    order: 15,
    label: () => t('nav'),
    locale: NS,
    inject: injected,
    children: { 'settings.plugin.item': { kind: 'list', scope: 'root' } },
  }, MarketplaceSettingsSection))
}
