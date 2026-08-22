import assert from 'node:assert/strict'
import {
  DEFAULT_MODEL_MODE,
  DEFAULT_PROMPT,
  normalizeModelMode,
  normalizePrompt,
  policyChangesRequest,
  resolveTitlePolicy,
} from '../lib/logic.js'

assert.equal(normalizePrompt(undefined), '')
assert.equal(normalizePrompt('   '), '')
assert.equal(normalizePrompt(`\n${DEFAULT_PROMPT}\n`), DEFAULT_PROMPT)
assert.equal(normalizeModelMode(undefined), DEFAULT_MODEL_MODE)
assert.equal(normalizeModelMode('custom'), 'custom')
assert.equal(normalizeModelMode('follow'), 'follow')

const original = Object.freeze({
  system: 'Create a concise title',
  provider: 'conversation-provider',
  model: 'conversation-model',
})

{
  const policy = resolveTitlePolicy({
    prompt: '   ',
    modelMode: 'follow',
    provider: '',
    model: '',
    availableProviders: ['conversation-provider'],
    original,
  })
  assert.equal(policy.system, undefined)
  assert.equal(policy.provider, undefined)
  assert.equal(policy.model, undefined)
  assert.equal(policy.fallback, undefined)
  assert.equal(policyChangesRequest(policy), false)
}

{
  const policy = resolveTitlePolicy({
    prompt: `  ${DEFAULT_PROMPT}  `,
    modelMode: 'follow',
    provider: 'ignored',
    model: 'ignored',
    availableProviders: ['deepseek-official'],
    original,
  })
  assert.equal(policy.system, DEFAULT_PROMPT)
  assert.equal(policy.provider, undefined)
  assert.equal(policy.model, undefined)
  assert.equal(policyChangesRequest(policy), true)
}

{
  const policy = resolveTitlePolicy({
    prompt: DEFAULT_PROMPT,
    modelMode: 'custom',
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    availableProviders: ['conversation-provider', 'deepseek-official'],
    original,
  })
  assert.equal(policy.system, DEFAULT_PROMPT)
  assert.equal(policy.provider, 'deepseek-official')
  assert.equal(policy.model, 'deepseek-v4-flash')
  assert.equal(policy.fallback, undefined)
}

{
  const policy = resolveTitlePolicy({
    prompt: DEFAULT_PROMPT,
    modelMode: 'custom',
    provider: 'missing-route',
    model: 'deepseek-v4-flash',
    availableProviders: ['conversation-provider'],
    original,
  })
  assert.equal(policy.system, DEFAULT_PROMPT)
  assert.equal(policy.provider, undefined)
  assert.equal(policy.model, undefined)
  assert.equal(policy.fallback, 'missing-provider')
}

{
  const incompleteProvider = resolveTitlePolicy({
    prompt: DEFAULT_PROMPT,
    modelMode: 'custom',
    provider: 'deepseek-official',
    model: '',
    availableProviders: ['deepseek-official'],
    original,
  })
  assert.equal(incompleteProvider.provider, undefined)
  assert.equal(incompleteProvider.model, undefined)
  assert.equal(incompleteProvider.fallback, undefined)

  const incompleteModel = resolveTitlePolicy({
    prompt: DEFAULT_PROMPT,
    modelMode: 'custom',
    provider: '',
    model: 'deepseek-v4-flash',
    availableProviders: ['deepseek-official'],
    original,
  })
  assert.equal(incompleteModel.provider, undefined)
  assert.equal(incompleteModel.model, undefined)
}

assert.equal(original.system, 'Create a concise title')
assert.equal(original.provider, 'conversation-provider')
assert.equal(original.model, 'conversation-model')

{
  const frozen = Object.freeze({
    purpose: 'session-title',
    system: 'Create a concise title',
    provider: 'conversation-provider',
    model: 'conversation-model',
  })
  const policy = resolveTitlePolicy({
    prompt: DEFAULT_PROMPT,
    modelMode: 'custom',
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    availableProviders: ['deepseek-official'],
    original: frozen,
  })
  const clone = {
    ...frozen,
    system: policy.system ?? frozen.system,
    provider: policy.provider ?? frozen.provider,
    model: policy.model ?? frozen.model,
  }
  assert.equal(frozen.system, 'Create a concise title')
  assert.equal(clone.system, DEFAULT_PROMPT)
  assert.equal(clone.provider, 'deepseek-official')
  assert.equal(clone.model, 'deepseek-v4-flash')
  assert.notEqual(clone, frozen)
}

console.log('policy.test.mjs ok')
