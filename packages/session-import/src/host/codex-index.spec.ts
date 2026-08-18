import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCodexThreadNames, lookupCodexThreadName } from './codex-index.ts'

test('loadCodexThreadNames reads thread_name from session_index.jsonl', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-codex-index-'))
  await mkdir(join(home, '.codex'))
  await writeFile(join(home, '.codex', 'session_index.jsonl'), [
    JSON.stringify({ id: 'abc', thread_name: '修复下游视频播放下载' }),
    JSON.stringify({ id: 'def', thread_name: 'FAC CLIProxyAPI 每日上游合并与部署' }),
  ].join('\n'))
  const names = await loadCodexThreadNames(home)
  assert.equal(names.get('abc'), '修复下游视频播放下载')
  assert.equal(lookupCodexThreadName(names, 'missing', 'def'), 'FAC CLIProxyAPI 每日上游合并与部署')
})
