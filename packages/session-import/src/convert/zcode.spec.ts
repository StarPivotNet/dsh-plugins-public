import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { convertZcodeSession, extractZcodeJson, zcodeSqlitePath } from './zcode.ts'

test('extracts a ZCode v2 JSON conversation', () => {
  const conversation = extractZcodeJson(JSON.stringify({
    meta: {
      taskId: 'claude-import-1',
      title: '拉取最新版',
      workspacePath: '/Volumes/ExternalData/Projects/CodexInstall',
      createdAt: 1,
      updatedAt: 2,
    },
    messages: [
      { role: 'user', content: '拉取最新版', timestamp: 1 },
      { role: 'assistant', content: '拉取成功', timestamp: 2 },
    ],
  }), '/tmp/claude-import-1.json')
  assert.equal(conversation.source, 'zcode')
  assert.equal(conversation.title, '拉取最新版')
  assert.equal(conversation.cwd, '/Volumes/ExternalData/Projects/CodexInstall')
  assert.equal(conversation.items.length, 2)
})

test('extracts a ZCode sqlite session with tools', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-zcode-'))
  const dbPath = join(dir, 'db.sqlite')
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE session (id TEXT, directory TEXT, path TEXT, title TEXT, time_created INTEGER, time_updated INTEGER, parent_id TEXT);
    CREATE TABLE message (id TEXT, session_id TEXT, data TEXT, sequence INTEGER, time_created INTEGER);
    CREATE TABLE part (message_id TEXT, session_id TEXT, data TEXT, sequence INTEGER, time_created INTEGER);
  `)
  db.prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, NULL)').run(
    'sess_1', '/tmp/fac', '/tmp/fac', 'FAC 每日合并', 10, 20,
  )
  db.prepare('INSERT INTO message VALUES (?, ?, ?, ?, ?)').run(
    'msg_u', 'sess_1', JSON.stringify({ role: 'user', time: { created: 10 } }), 0, 10,
  )
  db.prepare('INSERT INTO part VALUES (?, ?, ?, ?, ?)').run(
    'msg_u', 'sess_1', JSON.stringify({ type: 'text', text: '把定时任务复制过来' }), 0, 10,
  )
  db.prepare('INSERT INTO message VALUES (?, ?, ?, ?, ?)').run(
    'msg_a', 'sess_1', JSON.stringify({ role: 'assistant', time: { created: 20 } }), 1, 20,
  )
  db.prepare('INSERT INTO part VALUES (?, ?, ?, ?, ?)').run(
    'msg_a', 'sess_1', JSON.stringify({ type: 'text', text: '好的' }), 0, 20,
  )
  db.prepare('INSERT INTO part VALUES (?, ?, ?, ?, ?)').run(
    'msg_a',
    'sess_1',
    JSON.stringify({
      type: 'tool',
      callID: 'call_1',
      tool: 'Read',
      state: { status: 'completed', input: { file_path: '/tmp/a' }, output: 'ok' },
    }),
    1,
    21,
  )
  db.close()
  const converted = convertZcodeSession('', zcodeSqlitePath(dbPath, 'sess_1'))
  assert.equal(converted.source, 'zcode')
  assert.equal(converted.title, 'FAC 每日合并')
  assert.equal(converted.header.cwd, '/tmp/fac')
  assert.ok(converted.events.some(event => event.type === 'user/message'))
  assert.ok(converted.events.some(event => event.type === 'tool/call'))
  assert.ok(converted.events.some(event => event.type === 'tool/result'))
})
