/**
 * Pure helpers for restart-continue qualification. Free of cordis so the
 * unit script can import them under plain Node.
 * @module @starpivot/dsh-restart-continue/logic
 */

/** Settings namespace owned by this plugin. */
export const SETTINGS_NAMESPACE = 'restart-continue'

/** Field carrying whether host boot should auto-continue interrupted roots. */
export const ENABLED_FIELD = 'enabled'

/** Default: auto-continue on host boot. */
export const DEFAULT_ENABLED = true

/** Default interruption window: 24 hours. */
export const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Default parallel resume cap. */
export const DEFAULT_MAX_PARALLEL = 8

/** Plugin id used in the followup source and as the cordis patch-row id. */
export const PLUGIN_ID = 'restart-continue'

/** Package name: must match package.json, client module id, and patch row. */
export const PACKAGE_NAME = '@starpivot/dsh-restart-continue'

/** Host apiproxy plugin name; its Continue notice also counts as already woken. */
export const HOST_RESUME_PLUGIN = 'dsh-host-apiproxy'

/** Plugin names whose Continue notice after an interrupted turn is a duplicate. */
export const RESUME_NOTICE_PLUGINS = [PACKAGE_NAME, PLUGIN_ID, HOST_RESUME_PLUGIN]

/**
 * Continue notice body. Keep the Host sentence, then remind the model about
 * unknown tool outcomes.
 */
export const CONTINUE_TEXT = [
  'Continue the work that was interrupted by a restart.',
  'Inspect the current workspace first.',
  'Retry only read-only or idempotent tool calls.',
  'If a call may have had side effects, verify external state or ask the user — do not replay it blindly.',
].join(' ')

/**
 * Normalize the settings boolean; anything other than an explicit false is on.
 * @param {unknown} value stored preference
 * @returns {boolean}
 */
export function normalizeEnabled(value) {
  return value !== false
}

/**
 * Whether a session is a user-facing root this plugin may resume.
 * @param {{origin?: string, cwd?: string}} header session header
 * @returns {boolean}
 */
export function isEligibleRoot(header) {
  if (header == null || typeof header !== 'object') return false
  if (header.origin === 'subagent' || header.origin === 'automation') return false
  return typeof header.cwd === 'string' && header.cwd.length > 0
}

/**
 * Fold the latest interruption. An open tail is treated as interrupted at the
 * last event time (inspect will later append synthetic closers).
 * @param {readonly {type: string, time?: number, data?: {reason?: {kind?: string}}}[]} events
 * @returns {{interrupted: boolean, at: number | null}}
 */
export function foldInterruption(events) {
  let openStart = null
  let lastInterruptedAt = null
  let lastTime = null
  for (const event of events ?? []) {
    const time = typeof event.time === 'number' ? event.time : lastTime
    if (typeof time === 'number') lastTime = time
    if (event.type === 'turn/start') {
      openStart = time
      lastInterruptedAt = null
      continue
    }
    if (event.type === 'turn/end') {
      openStart = null
      if (event.data?.reason?.kind === 'interrupted') lastInterruptedAt = time
      else lastInterruptedAt = null
    }
  }
  if (openStart !== null) {
    return { interrupted: true, at: lastTime ?? openStart }
  }
  return { interrupted: lastInterruptedAt !== null, at: lastInterruptedAt }
}

/**
 * Whether a later plugin Continue notice already woke this interrupted turn.
 * A later `turn/start` means the interruption is no longer current, so this
 * returns false (qualification already rejects that case).
 * @param {readonly {type: string, data?: {source?: {kind?: string, plugin?: string}, reason?: {kind?: string}}}[]} events
 * @returns {boolean}
 */
export function alreadyContinued(events) {
  let afterCurrentInterrupt = false
  for (const event of events ?? []) {
    if (event.type === 'turn/start') {
      afterCurrentInterrupt = false
      continue
    }
    if (event.type === 'turn/end' && event.data?.reason?.kind === 'interrupted') {
      afterCurrentInterrupt = true
      continue
    }
    if (afterCurrentInterrupt && isResumeNotice(event)) return true
  }
  return false
}

/**
 * @param {{type: string, data?: {source?: {kind?: string, plugin?: string}}}} event
 * @returns {boolean}
 */
export function isResumeNotice(event) {
  if (event?.type !== 'user/message') return false
  return messageIsResumeNotice(event.data)
}

/**
 * Whether a live inbox UserMessage is a restart Continue notice.
 * @param {{source?: {kind?: string, plugin?: string}} | undefined} message
 * @returns {boolean}
 */
export function messageIsResumeNotice(message) {
  const source = message?.source
  if (source?.kind !== 'plugin') return false
  return RESUME_NOTICE_PLUGINS.includes(source.plugin)
}

/**
 * Qualify one persisted or live session for auto-continue.
 * @param {{header: {origin?: string, cwd?: string}, events: readonly object[], archived?: boolean}} session
 * @param {{now: number, maxAgeMs?: number}} clock
 * @returns {{ok: true, at: number} | {ok: false, reason: string}}
 */
export function qualifySession(session, clock) {
  if (session?.archived === true) return { ok: false, reason: 'archived' }
  if (!isEligibleRoot(session?.header ?? {})) return { ok: false, reason: 'not-root' }
  const fold = foldInterruption(session.events ?? [])
  if (!fold.interrupted) return { ok: false, reason: 'not-interrupted' }
  if (alreadyContinued(session.events ?? [])) return { ok: false, reason: 'already-continued' }
  const now = clock.now
  const maxAgeMs = Number(clock.maxAgeMs) > 0 ? Number(clock.maxAgeMs) : DEFAULT_MAX_AGE_MS
  if (typeof fold.at !== 'number') return { ok: false, reason: 'no-timestamp' }
  if (now - fold.at > maxAgeMs) return { ok: false, reason: 'stale' }
  return { ok: true, at: fold.at }
}

/**
 * Last logged provider/model/effort, if any. Used as resume `agentOptions`
 * so the first Continue request is not missing a route.
 * @param {readonly {type: string, data?: {header?: {config?: {provider?: string, model?: string, reasoningEffort?: string}}}}[]} events
 * @returns {{provider: string, model: string, reasoningEffort?: string} | undefined}
 */
export function foldLoggedRoute(events) {
  let route
  for (const event of events ?? []) {
    if (event.type !== 'request/header') continue
    const config = event.data?.header?.config
    if (typeof config?.provider !== 'string' || typeof config?.model !== 'string') continue
    route = {
      provider: config.provider,
      model: config.model,
      ...typeof config.reasoningEffort === 'string' ? { reasoningEffort: config.reasoningEffort } : {},
    }
  }
  return route
}

/**
 * Cap the resume set: newest interruption first, then id.
 * @param {Array<{id: string, at: number}>} candidates
 * @param {number} [maxParallel]
 * @returns {typeof candidates}
 */
export function pickResumeSet(candidates, maxParallel = DEFAULT_MAX_PARALLEL) {
  const cap = Number.isInteger(maxParallel) && maxParallel > 0 ? maxParallel : DEFAULT_MAX_PARALLEL
  return [...candidates]
    .sort((left, right) => right.at - left.at || (left.id < right.id ? -1 : 1))
    .slice(0, cap)
}
