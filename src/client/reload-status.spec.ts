import { asReloadStatus, hostGenerationAfterLoss, progressFromStatus } from './reload-status.ts'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

const status = asReloadStatus({
  phase: 'done',
  current: '',
  index: 29,
  total: 29,
  ok: 29,
  failed: 0,
  message: '重载完成, 成功重载 29 个插件',
  nonce: 4,
  clientIds: ['@deepseek-ai/dsh-client-ui-conversation'],
  names: ['include:agent-presets:persona', '@starpivot/dsh-plugin-marketplace'],
  rebootNonce: 2,
})
assert(status?.nonce === 4, 'parses nonce')
assert(status?.rebootNonce === 2, 'parses reboot nonce')
assert(status?.names.join(',') === 'include:agent-presets:persona,@starpivot/dsh-plugin-marketplace', 'parses names')
assert(progressFromStatus(status)?.message === '重载完成, 成功重载 29 个插件', 'progress message')
assert(asReloadStatus({ phase: 'nope' }) === undefined, 'rejects unknown phase')
assert(hostGenerationAfterLoss({ seenHost: false, lostHost: false, up: false }).reload === false, 'boot without host does not reload')
assert(hostGenerationAfterLoss({ seenHost: true, lostHost: false, up: false }).lostHost === true, 'host loss is remembered')
assert(hostGenerationAfterLoss({ seenHost: true, lostHost: true, up: true }).reload === true, 'new host generation reloads the page')
console.log('reload status checks passed')
