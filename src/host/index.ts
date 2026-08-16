/**
 * Out-of-tree Host marketplace. Registers a loopback Connection RPC channel
 * at /plugin-marketplace so the browser half does not need api-remotes.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import {
  packageExportsBundle,
  readProfileManifest,
  readProfilePatches,
  reconcileProfilePlugins,
  runProfilePnpm,
  writeProfilePatches,
  type ProfileHandle,
} from '@deepseek-ai/dsh-app-boot'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { isCatalogUrl, MAX_CATALOG_BYTES, parseCatalogDocument } from './catalog.ts'
import { installSpec, isInstallVersion, isRegistryPackageName } from './names.ts'
import type {
  CatalogSnapshot,
  InstalledPlugin,
  InstalledPluginKind,
  InstalledPluginSnapshot,
  PluginEnableResult,
  PluginFiberPhase,
  PluginMarketplaceErrorCode,
  PluginMarketplaceFailure,
  PluginMutationResult,
  SetEnabledRequest,
} from './types.ts'

export const name = 'plugin-marketplace'
export const inject = ['loader', 'profile', 'connection']

export const MARKETPLACE_BUNDLE_PACKAGE = '@starpivot/dsh-plugin-marketplace'
export const MARKETPLACE_HOST_ENTRY_ID = 'plugin-marketplace'
export const MARKETPLACE_CLIENT_ENTRY_ID = 'ui-settings-plugin-marketplace'
export const MARKETPLACE_SETTINGS_NAMESPACE = 'plugin-marketplace'
const SETTINGS_NS = settingsNamespace(MARKETPLACE_SETTINGS_NAMESPACE)
const CHANNEL = '/plugin-marketplace'

const FIBER_PHASE: Record<number, Exclude<PluginFiberPhase, 'mixed'>> = {
  0: 'pending',
  1: 'loading',
  2: 'active',
  3: 'failed',
  4: null,
  5: 'unloading',
}

export interface Config {
  catalogUrl?: string
  catalogTimeoutMs?: number
}

function fail(code: PluginMarketplaceErrorCode, message: string): PluginMarketplaceFailure {
  return { ok: false, code, message }
}

export function apply(ctx: Context, config: Config = {}): void {
  const resolved = {
    catalogUrl: config.catalogUrl ?? '',
    catalogTimeoutMs: config.catalogTimeoutMs ?? 10_000,
  }
  if (!isCatalogUrl(resolved.catalogUrl)) {
    throw new Error('plugin-marketplace: catalogUrl must be empty or an http(s) URL')
  }
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.get('settings') as {
      register: (ns: unknown, schema: unknown, options?: { base?: unknown }) => unknown
    }
    settings.register(SETTINGS_NS, z.object({ catalogUrl: z.string().default('') }), {
      base: { catalogUrl: resolved.catalogUrl },
    })
  })

  let inflight: Promise<unknown> | undefined
  const marketplace = {
    listInstalled(): InstalledPluginSnapshot {
      const profile = requireProfile(ctx)
      const manifest = readProfileManifest('plugin-marketplace', profile.dir)
      const dependencies = manifest.dependencies ?? {}
      const bundles = new Set(manifest.dsh?.profile?.bundles ?? [])
      const byPackage = new Map<string, InstalledPlugin>()
      for (const [packageName, spec] of Object.entries(dependencies)) {
        const isBundle = packageExportsBundle(
          'plugin-marketplace', packageName, profile.installAnchor, profile.dir,
        )
        const kind: InstalledPluginKind = isBundle || bundles.has(packageName) ? 'bundle' : 'dependency'
        byPackage.set(packageName, {
          packageName,
          spec,
          kind,
          installed: true,
          entryIds: [],
          enabled: true,
          fiberPhase: null,
          canUninstall: packageName !== MARKETPLACE_BUNDLE_PACKAGE,
          canToggle: false,
        })
      }
      for (const entry of ctx.loader.entries()) {
        if (entry.options.group) continue
        const packageName = entry.options.name
        const existing = byPackage.get(packageName)
        const fiberPhase = entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state] ?? null
        const enabled = !entry.disabled
        if (existing !== undefined) {
          const entryIds = [...existing.entryIds, entry.id]
          byPackage.set(packageName, {
            ...existing,
            entryIds,
            enabled: existing.enabled && enabled,
            fiberPhase: mergePhase(existing.fiberPhase, fiberPhase),
            canToggle: entryIds.length === 1 && packageName !== MARKETPLACE_BUNDLE_PACKAGE
              && entry.id !== MARKETPLACE_HOST_ENTRY_ID
              && entry.id !== MARKETPLACE_CLIENT_ENTRY_ID,
          })
          continue
        }
        byPackage.set(packageName, {
          packageName,
          spec: '',
          kind: 'inbox',
          installed: true,
          entryIds: [entry.id],
          enabled,
          fiberPhase,
          canUninstall: false,
          canToggle: entry.id !== MARKETPLACE_HOST_ENTRY_ID && entry.id !== MARKETPLACE_CLIENT_ENTRY_ID,
        })
      }
      return { profileName: profile.name, entries: [...byPackage.values()] }
    },
    async listCatalog(): Promise<CatalogSnapshot> {
      const catalogUrl = effectiveCatalogUrl(ctx, resolved.catalogUrl)
      if (catalogUrl.length === 0) return { configured: false, entries: [] }
      if (!isCatalogUrl(catalogUrl)) throw new Error('catalogUrl must be an http(s) URL')
      const controller = new AbortController()
      const timer = setTimeout(() => { controller.abort() }, resolved.catalogTimeoutMs)
      let response: Response
      try {
        response = await fetch(catalogUrl, { signal: controller.signal, redirect: 'follow' })
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      } finally {
        clearTimeout(timer)
      }
      if (!response.ok) throw new Error(`catalog responded ${String(response.status)}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.byteLength > MAX_CATALOG_BYTES) {
        throw new Error(`catalog exceeds ${String(MAX_CATALOG_BYTES)} bytes`)
      }
      let parsed: unknown
      try { parsed = JSON.parse(buffer.toString('utf8')) }
      catch { throw new Error('catalog is not JSON') }
      const document = parseCatalogDocument(parsed)
      if (!document.ok) throw new Error(document.message)
      return document.snapshot
    },
    install(request: { name: string; version?: string }): Promise<PluginMutationResult> {
      return serialize(async () => {
        if (!isRegistryPackageName(request.name)) {
          return fail('package-invalid', 'install accepts one npm registry package name')
        }
        if (request.version !== undefined && request.version.length > 0 && !isInstallVersion(request.version)) {
          return fail('version-invalid', 'install version must be a semver or tag fragment')
        }
        return runPnpm(ctx, ['add', installSpec(request.name, request.version)])
      })
    },
    uninstall(request: { name: string }): Promise<PluginMutationResult> {
      return serialize(async () => {
        if (!isRegistryPackageName(request.name)) {
          return fail('package-invalid', 'uninstall accepts one npm registry package name')
        }
        if (request.name === MARKETPLACE_BUNDLE_PACKAGE) {
          return fail('protected', 'the marketplace bundle cannot uninstall itself')
        }
        const profile = requireProfile(ctx)
        const manifest = readProfileManifest('plugin-marketplace', profile.dir)
        if (manifest.dependencies?.[request.name] === undefined) {
          return fail('not-installed', `${request.name} is not a profile dependency`)
        }
        return runPnpm(ctx, ['remove', request.name])
      })
    },
    setEnabled(request: SetEnabledRequest): Promise<PluginEnableResult> {
      return serialize(async () => {
        if (request.entryId === MARKETPLACE_HOST_ENTRY_ID || request.entryId === MARKETPLACE_CLIENT_ENTRY_ID) {
          return fail('protected', 'the marketplace entries cannot be disabled from the marketplace')
        }
        const listed = marketplace.listInstalled().entries.find(entry => entry.entryIds.includes(request.entryId))
        if (listed === undefined) {
          return fail('entry-missing', `no installed plugin owns entry ${request.entryId}`)
        }
        if (!listed.canToggle) {
          return fail('not-toggleable', `${listed.packageName} cannot be enabled or disabled as a single entry`)
        }
        const profile = requireProfile(ctx)
        const patches = readProfilePatches('plugin-marketplace', profile.dir)
        writeProfilePatches(profile.dir, applyEnablement(patches, request.entryId, request.enabled))
        return { ok: true }
      })
    },
  }

  async function serialize<T extends PluginMutationResult | PluginEnableResult>(work: () => Promise<T>): Promise<T> {
    if (inflight !== undefined) return fail('busy', 'another marketplace mutation is still running') as T
    const run = work()
    inflight = run
    try { return await run }
    finally { inflight = undefined }
  }

  ctx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
    try {
      switch (endpoint) {
        case 'listInstalled':
          return { ok: true, value: marketplace.listInstalled() }
        case 'listCatalog':
          return { ok: true, value: await marketplace.listCatalog() }
        case 'install':
          return { ok: true, value: await marketplace.install(payload as { name: string; version?: string }) }
        case 'uninstall':
          return { ok: true, value: await marketplace.uninstall(payload as { name: string }) }
        case 'setEnabled':
          return { ok: true, value: await marketplace.setEnabled(payload as SetEnabledRequest) }
        default:
          return { ok: false, error: { code: 'NOT_FOUND', message: 'unknown marketplace endpoint' } }
      }
    } catch (error) {
      return {
        ok: false,
        error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) },
      }
    }
  }, { authority: 'loopback' })
}

function requireProfile(ctx: Context): ProfileHandle {
  const profile = ctx.get('profile') as ProfileHandle | undefined
  if (profile === undefined) throw new Error('plugin-marketplace: ctx.profile is required')
  return profile
}

function effectiveCatalogUrl(ctx: Context, fallback: string): string {
  const section = (ctx.get('settings') as { get?: (ns: unknown) => { catalogUrl?: string } } | undefined)
    ?.get?.(SETTINGS_NS)
  if (typeof section?.catalogUrl === 'string') return section.catalogUrl.trim()
  return fallback.trim()
}

function runPnpm(ctx: Context, args: readonly string[]): PluginMutationResult {
  const profile = requireProfile(ctx)
  const before = readProfileManifest('plugin-marketplace', profile.dir)
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: 'pipe' })
  if (result.missingPnpm) {
    return fail('pnpm-missing', 'pnpm is not on PATH; install pnpm to manage profile plugins')
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `pnpm exited ${String(result.exitCode)}`
    return fail('pnpm-failed', detail)
  }
  reconcileProfilePlugins({
    binName: 'plugin-marketplace',
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before,
  })
  return { ok: true, restartRequired: true }
}

function mergePhase(left: PluginFiberPhase, right: PluginFiberPhase): PluginFiberPhase {
  if (left === right) return left
  if (left === null) return right
  if (right === null) return left
  return 'mixed'
}

function applyEnablement(patches: readonly PatchOptions[], entryId: string, enabled: boolean): PatchOptions[] {
  const next = patches.map(patch => ({ ...patch }))
  const index = next.findIndex(patch => patch.id === entryId && patch.insert === undefined)
  if (enabled) {
    if (index === -1) return next
    const current = { ...next[index]! }
    delete current.disabled
    if (Object.keys(current).filter(key => key !== 'id').length === 0) {
      next.splice(index, 1)
      return next
    }
    next[index] = current
    return next
  }
  if (index === -1) {
    next.push({ id: entryId, disabled: true })
    return next
  }
  next[index] = { ...next[index], disabled: true }
  return next
}
