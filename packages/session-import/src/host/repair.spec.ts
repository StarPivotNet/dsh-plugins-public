import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { constants, zstdCompress } from 'node:zlib'
import { promisify } from 'node:util'
import { repairImportedOnDisk } from './repair.ts'

const compress = promisify(zstdCompress)

test('repairImportedOnDisk moves a leftover import to the original cwd', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-import-repair-'))
  const sessionRoot = join(root, 'sessions')
  const fromDir = join(sessionRoot, '--Volumes-ExternalData-Projects-deepseek-harness--', 'import-codex-abc')
  await mkdir(fromDir, { recursive: true })
  const header = {
    type: 'session',
    version: 0,
    id: 'import-codex-abc',
    createdAt: 1,
    cwd: '/Volumes/ExternalData/Projects/deepseek-harness',
    delegationDepth: 0,
  }
  const frame = await compress(Buffer.from(JSON.stringify(header) + '\n'), {
    params: { [constants.ZSTD_c_checksumFlag]: 1 },
  })
  await writeFile(join(fromDir, 'session.jsonl.zstd'), frame)
  const workspacePath = join(root, 'workspace.json')
  const cachePath = join(root, 'session_projcache.json')
  await writeFile(workspacePath, JSON.stringify({
    tables: {
      workspaces: {
        a: { path: '/Volumes/ExternalData/Projects/deepseek-harness', sessionIds: ['import-codex-abc'] },
        b: { path: '/Volumes/ExternalData/Projects/fac', sessionIds: [] },
      },
    },
  }))
  await writeFile(cachePath, JSON.stringify({
    tables: {
      sessions: {
        'import-codex-abc': {
          identity: { createdAt: 1, cwd: '/Volumes/ExternalData/Projects/deepseek-harness' },
          rows: { title: { ver: 1, seq: 0, val: 'Aristotle' } },
        },
      },
    },
  }))
  const origins = new Map([['import-codex-abc', {
    id: 'import-codex-abc',
    cwd: '/Volumes/ExternalData/Projects/fac',
    title: 'Fix video playback',
  }]])
  const result = await repairImportedOnDisk({ sessionRoot, workspacePath, cachePath, origins })
  assert.equal(result.repaired, 1)
  assert.equal(result.failed.length, 0)
  const dest = join(sessionRoot, '--Volumes-ExternalData-Projects-fac--', 'import-codex-abc', 'session.jsonl.zstd')
  const moved = await readFile(dest)
  assert.ok(moved.byteLength > 0)
  const workspace = JSON.parse(await readFile(workspacePath, 'utf8')) as {
    tables: { workspaces: Record<string, { path: string; sessionIds: string[] }> }
  }
  assert.deepEqual(workspace.tables.workspaces.a.sessionIds, [])
  assert.deepEqual(workspace.tables.workspaces.b.sessionIds, ['import-codex-abc'])
  const cache = JSON.parse(await readFile(cachePath, 'utf8')) as {
    tables: { sessions: Record<string, { identity: { cwd: string }; rows: { title: { val: string } } }> }
  }
  assert.equal(cache.tables.sessions['import-codex-abc'].identity.cwd, '/Volumes/ExternalData/Projects/fac')
  assert.equal(cache.tables.sessions['import-codex-abc'].rows.title.val, 'Fix video playback')
})
