/**
 * busy-enter-steer — host daemon that seeds the stock Web busy-Enter
 * preference to Steer when the user has not set it.
 *
 * Stock DSH still defaults `ui-conversation.busyEnter` to Queue. This plugin
 * does not change that product default. It waits for the conversation
 * namespace, then writes `busyEnter: steer` only when the user section lacks
 * that field. An explicit Queue or Steer choice is left alone.
 *
 * @module dsh-plugin-busy-enter-steer
 */

import { settingsNamespace, SettingsConflictError } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { FIELD, shouldSeedSteer } from './logic.js'

export { shouldSeedSteer }

/** Plugin id (cordis patch-row `id`). */
export const name = 'busy-enter-steer'

/** Stock conversation settings namespace owned by ui-conversation. */
const NS = settingsNamespace('ui-conversation')

/** Seeded busy-Enter behavior when the user has not chosen one. */
const SEEDED = 'steer'

/** Startup poll cadence while waiting for the conversation namespace. */
const SETTLE_POLL_MS = 250

/** Startup poll budget: ~30 seconds, then event triggers only. */
const SETTLE_POLL_MAX = 120

export const Config = z.object({})

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    const log = ctx.logger
    let inFlight = false
    let retryOnce = true

    /** Current raw conversation descriptor, when the namespace is registered. */
    const descriptor = () => settingsCtx.settings.describe().find(row => row.ns === NS)

    /**
     * Write Steer once the conversation namespace exists and the user has
     * not stored a busyEnter override.
     * @param {string} reason trigger label for the log
     */
    const seed = async (reason) => {
      if (inFlight) return
      const desc = descriptor()
      if (desc === undefined) return
      if (!shouldSeedSteer(desc.user)) return
      inFlight = true
      try {
        await settingsCtx.settings.mutate(NS, [{ op: 'set', path: [FIELD], value: SEEDED }], desc.revision)
        log.info(`busy-enter-steer: seeded ${FIELD}=${SEEDED} (${reason})`)
        retryOnce = true
      } catch (error) {
        if (error instanceof SettingsConflictError && retryOnce) {
          retryOnce = false
          inFlight = false
          void seed(`${reason} (conflict)`)
          return
        }
        log.warn(`busy-enter-steer: write refused (${error.message})`)
      } finally {
        inFlight = false
      }
    }

    let polls = 0
    const settle = setInterval(() => {
      polls += 1
      if (descriptor() !== undefined) {
        clearInterval(settle)
        void seed('startup')
      } else if (polls >= SETTLE_POLL_MAX) {
        clearInterval(settle)
      }
    }, SETTLE_POLL_MS)
    settle.unref?.()
    ctx.effect(() => () => clearInterval(settle), 'busy-enter-steer: settle poll')

    ctx.effect(() => settingsCtx.on('settings/document-updated', (ns) => {
      if (ns === NS) void seed('settings-updated')
    }), 'busy-enter-steer: settings listener')
  })
}
