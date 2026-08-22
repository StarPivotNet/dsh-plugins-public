/**
 * Session title settings: host intercept of purpose=session-title LLM calls.
 *
 * Replaces the frozen helper system prompt and optional route from the live
 * `session-title` settings section. Empty prompt keeps the DSH built-in
 * English instruction. Custom models that are not registered fall back to
 * the conversation route with a warning. The helper still logs the original
 * `session/title-llm-request`; the dispatched envelope is the clone.
 *
 * @module @starpivot/dsh-session-title
 */

import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_MODEL_MODE,
  DEFAULT_PROMPT,
  MODEL_FIELD,
  MODEL_MODE_FIELD,
  MODEL_MODES,
  PLUGIN_ID,
  PROMPT_FIELD,
  PROVIDER_FIELD,
  SETTINGS_NAMESPACE,
  policyChangesRequest,
  resolveTitlePolicy,
} from './logic.js'

export const name = PLUGIN_ID
export const inject = ['llm']

export {
  DEFAULT_MODEL_MODE,
  DEFAULT_PROMPT,
  MODEL_FIELD,
  MODEL_MODE_FIELD,
  MODEL_MODES,
  PLUGIN_ID,
  PROMPT_FIELD,
  PROVIDER_FIELD,
  SETTINGS_NAMESPACE,
  policyChangesRequest,
  resolveTitlePolicy,
}

/** Durable schema; also the wire envelope the browser scope validates against. */
export const SessionTitleSchema = z.object({
  [PROMPT_FIELD]: z.string().default(DEFAULT_PROMPT),
  [MODEL_MODE_FIELD]: z.union([...MODEL_MODES]).default(DEFAULT_MODEL_MODE),
  [PROVIDER_FIELD]: z.string().default(''),
  [MODEL_FIELD]: z.string().default(''),
})

/**
 * Read the live title section, or undefined when settings are absent.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @returns {object | undefined}
 */
function readSection(ctx) {
  const settings = ctx.get('settings')
  if (settings === undefined) return undefined
  try {
    return settings.get(settingsNamespace(SETTINGS_NAMESPACE))
  } catch {
    // namespace not registered yet, or a thin composition without settings
    return undefined
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), SessionTitleSchema)
  })

  const patched = new WeakSet()
  ctx.on('llm/stream', (options, next) => {
    if (options == null || typeof options !== 'object') return next()
    if (patched.has(options)) return next()
    if (options.purpose !== 'session-title') return next()
    const section = readSection(ctx)
    if (section === undefined) return next()
    const availableProviders = ctx.llm.listProviders().map(provider => provider.id)
    const policy = resolveTitlePolicy({
      prompt: section[PROMPT_FIELD],
      modelMode: section[MODEL_MODE_FIELD],
      provider: section[PROVIDER_FIELD],
      model: section[MODEL_FIELD],
      availableProviders,
      original: {
        system: options.system,
        provider: options.provider,
        model: options.model,
      },
    })
    if (policy.fallback === 'missing-provider') {
      ctx.logger.warn(
        `session-title: custom route ${String(section[PROVIDER_FIELD])}/${String(section[MODEL_FIELD])} is unavailable; using conversation route`,
      )
    }
    if (!policyChangesRequest(policy)) return next()
    const clone = {
      ...options,
      system: policy.system ?? options.system,
      provider: policy.provider ?? options.provider,
      model: policy.model ?? options.model,
    }
    patched.add(clone)
    return ctx.llm.stream(clone)
  })
}
