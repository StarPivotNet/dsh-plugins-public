/**
 * restart-continue — host daemon that cold-resumes user-facing root
 * conversations whose latest turn was crash/reload-interrupted within the
 * configured window, then sends one plugin Continue notice.
 *
 * Host `session.list` already schedules `dsh-host-apiproxy` followups, but
 * only after a 1KB cold-blank probe. This plugin inspects eligible roots
 * itself, mounts the stored preset, and wakes with a plugin-source message
 * so Goal stays disarmed.
 *
 * @module @starpivot/dsh-restart-continue
 */

import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { resolveSessionPreset } from '@deepseek-ai/dsh-agent-presets'
import z from '@deepseek-ai/schemastery'
import {
  CONTINUE_TEXT,
  DEFAULT_ENABLED,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MAX_PARALLEL,
  ENABLED_FIELD,
  PACKAGE_NAME,
  PLUGIN_ID,
  SETTINGS_NAMESPACE,
  normalizeEnabled,
  pickResumeSet,
  foldLoggedRoute,
  messageIsResumeNotice,
  qualifySession,
} from './logic.js'

export const name = PLUGIN_ID
export const inject = ['agents', 'sessionPersistence']

export {
  CONTINUE_TEXT,
  DEFAULT_ENABLED,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MAX_PARALLEL,
  ENABLED_FIELD,
  PACKAGE_NAME,
  PLUGIN_ID,
  SETTINGS_NAMESPACE,
  normalizeEnabled,
  foldLoggedRoute,
  messageIsResumeNotice,
  pickResumeSet,
  qualifySession,
}

/** Durable schema; also the wire envelope the browser scope validates against. */
export const RestartContinueSchema = z.object({
  [ENABLED_FIELD]: z.boolean().default(DEFAULT_ENABLED),
})

export const Config = z.object({
  /** Milliseconds after an interruption during which a root may auto-continue. */
  maxAgeMs: z.number().default(DEFAULT_MAX_AGE_MS),
  /** Maximum concurrent cold resumes on one boot. */
  maxParallel: z.number().default(DEFAULT_MAX_PARALLEL),
})

/**
 * Read the live on/off preference, defaulting to on.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @returns {boolean}
 */
function readEnabled(ctx) {
  const settings = ctx.get('settings')
  if (settings === undefined) return DEFAULT_ENABLED
  try {
    const section = settings.get(settingsNamespace(SETTINGS_NAMESPACE))
    return normalizeEnabled(section?.[ENABLED_FIELD])
  } catch {
    // namespace not registered yet, or a thin composition without settings
    return DEFAULT_ENABLED
  }
}

/**
 * Collect archived session ids when the workspace registry is mounted.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @returns {Set<string>}
 */
function archivedIds(ctx) {
  const registry = ctx.get('workspaceRegistry')
  const ids = registry?.archivedSessionIds
  return new Set(Array.isArray(ids) ? ids : [])
}

/**
 * Join the stored preset and install model selection so the first Continue
 * request uses the logged route (else the Host default) and the same tools.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{header: object, events: readonly object[]}} inspected
 * @returns {(agentCtx: import('@deepseek-ai/cordis').Context) => Promise<void>}
 */
function resumeSetup(ctx, inspected) {
  return async (agentCtx) => {
    const agent = agentCtx.agent
    if (agent !== undefined) {
      const defaults = ctx.get('agentDefaultModel')
      let picked
      installModelSelection(agentCtx, {
        get current() {
          if (picked !== undefined) return picked
          const logged = agent.session.requestHeader?.()?.config
          if (logged !== undefined) {
            return {
              provider: logged.provider,
              model: logged.model,
              ...logged.reasoningEffort === undefined ? {} : { reasoningEffort: logged.reasoningEffort },
            }
          }
          return defaults?.currentSelection?.()
        },
        set current(next) {
          picked = next
        },
        assembled: undefined,
      })
    }
    const presets = ctx.get('agentPresets')
    if (presets === undefined) return
    const presetId = resolveSessionPreset({
      header: inspected.header ?? inspected.meta,
      events: inspected.events,
    })
    await presets.mount(agentCtx, presetId)
  }
}

/**
 * Whether the Agent already has a restart Continue notice queued.
 * @param {import('@deepseek-ai/dsh-agent').Agent} agent
 * @returns {boolean}
 */
function queuedResume(agent) {
  const pending = [...(agent.inbox?.nextTurn ?? []), ...(agent.inbox?.nextStep ?? [])]
  return pending.some(message => messageIsResumeNotice(message))
}

/**
 * Send the Continue notice. Skip a live running agent or a queued notice.
 * @param {import('@deepseek-ai/dsh-agent').Agent} agent
 * @returns {boolean}
 */
function wake(agent) {
  if (agent.status === 'running') return false
  if (queuedResume(agent)) return false
  agent.followup(createUserMessage({
    content: [{ type: 'text', text: CONTINUE_TEXT }],
    source: {
      kind: 'plugin',
      plugin: PACKAGE_NAME,
      form: 'notice',
      summary: 'Resumed after restart',
    },
  }))
  return true
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{maxAgeMs?: number, maxParallel?: number}} config
 */
export function apply(ctx, config) {
  const maxAgeMs = Number(config?.maxAgeMs) > 0 ? Number(config.maxAgeMs) : DEFAULT_MAX_AGE_MS
  const maxParallel = Number(config?.maxParallel) > 0 ? Number(config.maxParallel) : DEFAULT_MAX_PARALLEL

  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), RestartContinueSchema)
  })

  ctx.inject(['agents', 'sessionPersistence'], (ready) => {
    const log = ctx.logger
    const scheduled = new Set()
    let swept = false

    /**
     * Run `fn` after the settings namespace exists (so a stored off is
     * honored) and workspaceRegistry has had a chance to mount. A
     * composition without those services still continues after the timeout.
     * @param {() => void} fn
     */
    const afterOptionalServices = (fn) => {
      let done = false
      const once = () => {
        if (done) return
        done = true
        fn()
      }
      const namespaceReady = () => {
        const settings = ctx.get('settings')
        if (settings === undefined) return false
        try {
          return settings.describe().some(row => row.ns === settingsNamespace(SETTINGS_NAMESPACE))
        } catch {
          return false
        }
      }
      const registryReady = () => ctx.get('workspaceRegistry') !== undefined
      if (namespaceReady() && registryReady()) {
        queueMicrotask(once)
        return
      }
      const missing = ['settings', 'workspaceRegistry'].filter(name => ctx.get(name) === undefined)
      if (missing.length > 0) {
        ctx.inject(missing, () => {
          if (namespaceReady() && registryReady()) once()
        })
      }
      let polls = 0
      const settle = setInterval(() => {
        polls += 1
        if (namespaceReady() && registryReady()) {
          clearInterval(settle)
          once()
          return
        }
        if (polls >= 20) {
          clearInterval(settle)
          once()
        }
      }, 250)
      settle.unref?.()
      ctx.effect(() => () => { clearInterval(settle) }, 'restart-continue: optional-service wait')
    }

    /**
     * Inspect one persisted id, or reuse a live session's events.
     * @param {string} id
     */
    const loadSession = async (id) => {
      const live = ctx.get('sessions')?.get?.(id)
      if (live !== undefined) {
        return { header: live.header, events: live.events, live }
      }
      const inspected = await ready.sessionPersistence.inspect(id)
      return { header: inspected.meta, events: inspected.events, live: undefined }
    }

    /**
     * Resume one qualified id once.
     * @param {string} id
     */
    const resumeOne = async (id) => {
      if (scheduled.has(id)) return
      scheduled.add(id)
      try {
        const loaded = await loadSession(id)
        const verdict = qualifySession({
          header: loaded.header,
          events: loaded.events,
          archived: archivedIds(ctx).has(id),
        }, { now: Date.now(), maxAgeMs })
        if (!verdict.ok) {
          log.info(`restart-continue: skip ${id} (${verdict.reason})`)
          return
        }
        const existing = ready.agents.get(id)
        if (existing !== undefined) {
          if (wake(existing)) log.info(`restart-continue: woke live ${id}`)
          return
        }
        const logged = foldLoggedRoute(loaded.events)
        const defaults = ctx.get('agentDefaultModel')?.currentSelection?.()
        const route = logged ?? (defaults?.provider && defaults?.model
          ? { provider: defaults.provider, model: defaults.model, ...defaults.reasoningEffort === undefined ? {} : { reasoningEffort: defaults.reasoningEffort } }
          : undefined)
        const handle = await ready.agents.resume({
          resumeSessionId: id,
          ...route === undefined ? {} : { agentOptions: route },
          setup: resumeSetup(ctx, loaded),
        })
        if (wake(handle.agent)) log.info(`restart-continue: resumed ${id}`)
      } catch (error) {
        scheduled.delete(id)
        log.warn(`restart-continue: resume "${id}" failed: ${String(error)}`)
      }
    }

    const sweep = async () => {
      if (swept) return
      swept = true
      if (!readEnabled(ctx)) {
        log.info('restart-continue: disabled; skipping boot sweep')
        return
      }
      const archived = archivedIds(ctx)
      const headers = await ready.sessionPersistence.list()
      const liveSessions = ctx.get('sessions')
      const candidates = []
      for (const header of headers) {
        if (archived.has(header.id)) continue
        if (!header.cwd) continue
        if (header.origin === 'subagent' || header.origin === 'automation') continue
        let events
        try {
          const live = liveSessions?.get?.(header.id)
          events = live?.events ?? (await ready.sessionPersistence.inspect(header.id)).events
        } catch (error) {
          log.warn(`restart-continue: inspect "${header.id}" failed: ${String(error)}`)
          continue
        }
        const verdict = qualifySession({
          header,
          events,
          archived: archived.has(header.id),
        }, { now: Date.now(), maxAgeMs })
        if (!verdict.ok) continue
        candidates.push({ id: header.id, at: verdict.at })
      }
      const picked = pickResumeSet(candidates, maxParallel)
      if (picked.length === 0) {
        log.info('restart-continue: no interrupted roots to resume')
        return
      }
      log.info(`restart-continue: resuming ${picked.length} interrupted root(s)`)
      await Promise.all(picked.map(item => resumeOne(item.id)))
    }

    afterOptionalServices(() => { void sweep() })
  })
}
