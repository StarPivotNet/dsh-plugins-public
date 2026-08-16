/** Out-of-tree marketplace page. Mounts over the shipped Plugins settings section. */

import type { ClientContext, SessionFace } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CommandUiContract } from '@deepseek-ai/dsh-client-ui-commands/client'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  MarketplaceSettingsSection,
  type MarketplaceMutationResult,
  type MarketplaceSettingsSectionInjected,
} from './MarketplaceSettingsSection.tsx'
import { commandLine, reloadPickOptions, updatePickOptions, type CommandTargets } from './command-picker.ts'
import { ReloadCommandCard } from './ReloadCommandCard.tsx'
import { ReloadProgressToast, type ReloadProgress } from './ReloadProgressToast.tsx'
import { reloadMarketplacePage, type MarketplacePageReloadHost } from './reload-page.ts'
import {
  asReloadStatus, hostGenerationAfterLoss, progressFromStatus, sameReloadStatus,
  type ReloadStatus,
} from './reload-status.ts'
import { en, zh } from './locales.ts'

export const NS = 'settings.pluginMarketplace'
export { MARKETPLACE_CLIENT_PACKAGE } from './reload-page.ts'
export const inject = ['slots', 'locale', 'settingsScope', 'connection', 'loader', 'modules', 'commandUi', 'sessions']

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
  const catalogScope = ctx.settingsScope.bind<{
    catalogUrls: string[]
  }>({
    namespace: 'plugin-marketplace',
  })
  const callMarketplace = marketplaceCaller(ctx)
  const host = document.createElement('div')
  host.dataset.pluginMarketplaceReload = 'true'
  document.body.append(host)
  const root: Root = createRoot(host)
  let reloadStatus: ReloadStatus | undefined
  let lastNonce: number | undefined
  let lastRebootNonce: number | undefined
  let toastLive = false
  let rebootSettled = sessionStorage.getItem('dsh-marketplace-rebooted') === '1'
  let pageReload = Promise.resolve()
  const listeners = new Set<() => void>()
  const renderToast = (): void => {
    root.render(createElement(ReloadProgressToast, {
      progress: progressFromStatus(reloadStatus),
      live: toastLive,
      t,
    }))
  }
  const adoptStatus = (next: ReloadStatus | undefined, triggerPageReload: boolean): void => {
    if (sameReloadStatus(reloadStatus, next)) return
    const previous = reloadStatus
    reloadStatus = next
    if (lastNonce !== undefined && next !== undefined && (
      next.phase === 'running' || (next.phase === 'done' && previous?.phase === 'running')
    )) {
      toastLive = true
    }
    for (const listener of listeners) listener()
    renderToast()
    const nonce = next?.nonce ?? 0
    const rebootNonce = next?.rebootNonce ?? 0
    if (lastNonce === undefined) lastNonce = nonce
    if (lastRebootNonce === undefined) lastRebootNonce = rebootNonce
    if (triggerPageReload && rebootNonce > lastRebootNonce) {
      lastRebootNonce = rebootNonce
      lastNonce = nonce
      sessionStorage.setItem('dsh-marketplace-rebooted', '1')
      window.location.reload()
      return
    }
    if (!triggerPageReload || nonce <= lastNonce || next === undefined) return
    lastNonce = nonce
    pageReload = pageReload.then(() => reloadMarketplacePage({
      loader: ctx.get('loader') as MarketplacePageReloadHost['loader'],
      modules: ctx.get('modules') as MarketplacePageReloadHost['modules'],
    }, next.clientIds)).catch((error: unknown) => {
      console.error('plugin-marketplace: page reload failed', error)
    })
  }
  const pollReload = async (): Promise<void> => {
    try { adoptStatus(asReloadStatus(await callMarketplace('reloadStatus')), true) }
    catch { /* keep last known status */ }
  }
  const connection = ctx.get('connection') as {
    hostDescription?: {
      getSnapshot(): unknown
      subscribe(listener: () => void): () => void
    }
  }
  const hostDescription = connection.hostDescription
  if (hostDescription !== undefined) {
    let generation = {
      seenHost: hostDescription.getSnapshot() !== undefined,
      lostHost: false,
    }
    if (rebootSettled) sessionStorage.removeItem('dsh-marketplace-rebooted')
    const offHost = hostDescription.subscribe(() => {
      generation = hostGenerationAfterLoss({
        ...generation,
        up: hostDescription.getSnapshot() !== undefined,
      })
      if (!generation.reload) return
      sessionStorage.setItem('dsh-marketplace-rebooted', '1')
      window.location.reload()
    })
    ctx.effect(() => () => { offHost() }, 'plugin-marketplace: reboot page refresh')
  }
  renderToast()
  void pollReload()
  const timer = window.setInterval(() => { void pollReload() }, 400)
  ctx.effect(() => () => {
    window.clearInterval(timer)
    root.unmount()
    host.remove()
  }, 'plugin-marketplace: reload toast')

  const mutation = (value: { ok: true; restartRequired?: true } | { ok: false; message: string }): MarketplaceMutationResult => {
    if (!value.ok) return { ok: false, message: value.message }
    return value.restartRequired === true ? { ok: true, restartRequired: true } : { ok: true }
  }

  const injected = (): MarketplaceSettingsSectionInjected => ({
    listInstalled: () => callMarketplace('listInstalled'),
    listCatalog: () => callMarketplace('listCatalog'),
    refreshCatalog: url => callMarketplace('refreshCatalog', url === undefined ? {} : { url }),
    install: async (name, version) => mutation(await callMarketplace(
      'install',
      version === undefined ? { name } : { name, version },
    )),
    uninstall: async (name) => mutation(await callMarketplace('uninstall', { name })),
    setEnabled: async (entryId, enabled) => mutation(await callMarketplace('setEnabled', { entryId, enabled })),
    catalogUrls: catalogScope.getSnapshot().value?.catalogUrls ?? [],
    setCatalogUrls: async (value) => { await catalogScope.set('catalogUrls', value) },
  })

  const commandCard = (props: {
    node: { name: string | null; outcome: { kind: 'success' | 'error'; text?: string } | null }
  }) => createElement(ReloadCommandCard, {
    node: props.node,
    progress: progressFromStatus(reloadStatus),
    names: reloadStatus?.names ?? [],
    rebootSettled,
    progressSource: {
      get: () => progressFromStatus(reloadStatus),
      names: () => reloadStatus?.names ?? [],
      rebootSettled: () => rebootSettled,
      subscribe: listener => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
  })
  ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
    name: 'conversation.chat.commandview',
    key: 'reload',
    locale: NS,
  }, commandCard))
  ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
    name: 'conversation.chat.commandview',
    key: 'reboot',
    locale: NS,
  }, commandCard))

  const command = ctx.get('commandUi') as CommandUiContract | undefined
  const sessions = ctx.get('sessions') as { get(id: string): SessionFace } | undefined
  if (command !== undefined && sessions !== undefined) {
    const decorateNamed = (name: 'reload' | 'update'): void => {
      ctx.effect(() => command.decorate({
        name,
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async () => {
            const targets = await callMarketplace<CommandTargets>('listCommandTargets')
            return name === 'reload'
              ? reloadPickOptions(targets.reload, t('reloadAll'), t('reloadAllDetail'))
              : updatePickOptions(targets.update, t('updateAll'), t('updateAllDetail'))
          },
          onSelect: async (option, session) => {
            const live = sessions.get(session.sessionId)
            const result = await live.command(commandLine(name, option.id))
            if (!result.ok) throw new Error(`pluginMarketplace.${name} failed: ${result.error.message}`)
            if (!result.value.matched) throw new Error(`the host offers no /${name} command`)
          },
        },
      }), `plugin-marketplace: /${name} picker`)
    }
    decorateNamed('reload')
    decorateNamed('update')
  }

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
