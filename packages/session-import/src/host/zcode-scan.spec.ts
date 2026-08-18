import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { discoverZcodeSessions } from './zcode-scan.ts'

test('discoverZcodeSessions lists sqlite rows and v2 JSON files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-zcode-scan-'))
  const dbPath = join(root, 'db.sqlite')
  const db = new DatabaseSync(dbPath)
  db.exec('CREATE TABLE session (id TEXT, directory TEXT, path TEXT, title TEXT, time_created INTEGER, time_updated INTEGER, parent_id TEXT)')
  db.prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, NULL)').run('sess_1', '/tmp/fac', '/tmp/fac', 'FAC 每日合并', 10, 20)
  db.prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?)').run('sess_child', '/tmp/fac', '/tmp/fac', 'child', 11, 21, 'sess_1')
  db.close()
  const jsonDir = join(root, 'sessions', 'abc')
  await mkdir(jsonDir, { recursive: true })
  await writeFile(join(jsonDir, 'claude-import-1.json'), JSON.stringify({
    meta: { taskId: 't1', title: '拉取最新版', workspacePath: '/tmp/codex' },
    messages: [],
  }))
  const rows = await discoverZcodeSessions([dbPath, join(root, 'sessions')])
  assert.equal(rows.some(row => row.nativeId === 'sess_1' && row.title === 'FAC 每日合并'), true)
  assert.equal(rows.some(row => row.nativeId === 'sess_child'), false)
  assert.equal(rows.some(row => row.path.endsWith('claude-import-1.json')), true)
})
