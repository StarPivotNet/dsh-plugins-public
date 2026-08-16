import {
  isMarketplaceEntry, isSkeletonEntry, matchReloadTarget, partitionReloadEntries,
  reloadHostEntry, selectReloadEntries,
} from './reload.ts'
import { resolveUpdateTarget } from './update.ts'
import { rebootBlocked, REBOOT_ENV } from './reboot.ts'

const entries = [
  { id: 'plugin-marketplace', moduleName: '@starpivot/dsh-plugin-marketplace/host' },
  { id: 'llm', moduleName: '@deepseek-ai/dsh-llm' },
  { id: 'session', moduleName: '@deepseek-ai/dsh-session' },
]

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

assert(matchReloadTarget(entries, '').kind === 'all', 'empty query reloads all')
assert(matchReloadTarget(entries, 'llm').kind === 'one', 'id match')
assert(matchReloadTarget(entries, '@deepseek-ai/dsh-session').kind === 'one', 'module match')
assert(matchReloadTarget(entries, 'missing').kind === 'none', 'unknown')
assert(isSkeletonEntry('connection', '@deepseek-ai/dsh-client-connection'), 'connection is skeleton')
assert(isSkeletonEntry('include:session', '@deepseek-ai/dsh-session'), 'nested session is skeleton')
assert(!isSkeletonEntry('plain-plugin', 'plain-lib'), 'extra plugin is not skeleton')
const selectedAll = selectReloadEntries([
  { id: 'include:session', moduleName: '@deepseek-ai/dsh-session', enabled: true, async refresh() {} },
  { id: 'include:llm', moduleName: '@deepseek-ai/dsh-llm', enabled: true, async refresh() {} },
  { id: 'ui-skill', moduleName: '@deepseek-ai/dsh-client-ui-skill', enabled: true, async refresh() {} },
  { id: 'plain', moduleName: 'plain-lib', enabled: true, async refresh() {} },
], { kind: 'all' })
assert(selectedAll.ok && selectedAll.selected.map(entry => entry.id).join(',') === 'ui-skill,plain', 'all skips nested session/llm')
assert(isSkeletonEntry('include:llm', '@deepseek-ai/dsh-llm'), 'nested llm is skeleton')
const namedCore = selectReloadEntries([
  { id: 'connection', moduleName: '@deepseek-ai/dsh-client-connection', enabled: true, async refresh() {} },
], { kind: 'one', entry: { id: 'connection', moduleName: '@deepseek-ai/dsh-client-connection' } })
assert(!namedCore.ok, 'named skeleton requires reboot')
assert(!isSkeletonEntry('ui-skill', '@deepseek-ai/dsh-client-ui-skill'), 'overlay ui plugin is reloadable')
assert(isMarketplaceEntry('plugin-marketplace', '@starpivot/dsh-plugin-marketplace/host'), 'marketplace host')
assert(!isSkeletonEntry('plugin-marketplace', '@starpivot/dsh-plugin-marketplace/host'), 'marketplace is reloadable last')
const split = partitionReloadEntries([
  { id: 'plain', moduleName: 'plain-lib', enabled: true, async refresh() {} },
  { id: 'plugin-marketplace', moduleName: '@starpivot/dsh-plugin-marketplace/host', enabled: true, async refresh() {} },
])
assert(split.others.map(entry => entry.id).join(',') === 'plain', 'others first')
assert(split.marketplace.map(entry => entry.id).join(',') === 'plugin-marketplace', 'marketplace last')
assert(resolveUpdateTarget(['@starpivot/dsh-plugin-marketplace', 'plain-lib'], '').kind === 'all', 'update all')
assert(resolveUpdateTarget(['plain-lib'], 'plain-lib').kind === 'one', 'update one')
assert(resolveUpdateTarget(['plain-lib'], 'cordis:include').kind === 'none', 'inbox cannot update')
assert(rebootBlocked(20_000, { [REBOOT_ENV]: '10000' }) !== undefined, 'cooldown blocks')
assert(rebootBlocked(40_000, { [REBOOT_ENV]: '10000' }) === undefined, 'cooldown expires')

const calls: string[] = []
const entry = {
  id: 'llm',
  moduleName: '@deepseek-ai/dsh-llm',
  enabled: true,
  fiber: {
    async dispose() { calls.push('dispose') },
    async await() { calls.push('await') },
  } as { dispose(): Promise<unknown>; await(): Promise<unknown> } | undefined,
  async refresh() {
    calls.push('refresh')
    this.fiber = {
      async dispose() { calls.push('dispose2') },
      async await() { calls.push('await') },
    }
  },
}
const result = await reloadHostEntry(entry)
assert(result.ok, 'reload ok')
assert(calls.join(',') === 'dispose,refresh,await', 'order ' + calls.join(','))
console.log('host unit checks passed')
