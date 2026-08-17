import assert from 'node:assert/strict'
import test from 'node:test'
import { persistConverted, withWorkspaceCwd } from './import.ts'
import { convertClaudeSession } from '../convert/claude.ts'

test('persistConverted writes header then events once', async () => {
  const converted = convertClaudeSession(JSON.stringify({
    type: 'user',
    sessionId: 's1',
    timestamp: '2026-08-02T14:58:37.721Z',
    message: { role: 'user', content: 'hi' },
  }), '/tmp/s1.jsonl')
  const created: unknown[] = []
  const appended: unknown[] = []
  const persistence = {
    async create(meta: unknown) { created.push(meta) },
    async append(id: string, events: unknown) { appended.push({ id, events }) },
  }
  const first = await persistConverted(persistence, converted)
  assert.equal(first.ok, true)
  assert.equal(first.ok && first.alreadyImported, false)
  assert.equal(created.length, 1)
  assert.equal(appended.length, 1)
})

test('persistConverted treats an existing id as already imported', async () => {
  const converted = convertClaudeSession(JSON.stringify({
    type: 'user',
    sessionId: 's1',
    timestamp: '2026-08-02T14:58:37.721Z',
    message: { role: 'user', content: 'hi' },
  }), '/tmp/s1.jsonl')
  const persistence = {
    async create() { throw new Error('session "import-claude-s1" already has a persisted log on disk') },
    async append() { throw new Error('should not append') },
  }
  const result = await persistConverted(persistence, converted)
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.alreadyImported, true)
})

test('withWorkspaceCwd rewrites the header cwd', () => {
  const converted = convertClaudeSession(JSON.stringify({
    type: 'user',
    sessionId: 's1',
    cwd: '/tmp/foreign',
    timestamp: '2026-08-02T14:58:37.721Z',
    message: { role: 'user', content: 'hi' },
  }), '/tmp/s1.jsonl')
  assert.equal(converted.header.cwd, '/tmp/foreign')
  assert.equal(withWorkspaceCwd(converted, '/tmp/workspace').header.cwd, '/tmp/workspace')
})
