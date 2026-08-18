import assert from 'node:assert/strict'
import test from 'node:test'
import { convertClaudeSession } from './claude.ts'

const session = [
  JSON.stringify({ type: 'mode', mode: 'normal', sessionId: 's1' }),
  JSON.stringify({
    type: 'user',
    uuid: 'u1',
    timestamp: '2026-08-02T14:58:37.721Z',
    cwd: '/tmp/proj',
    sessionId: 's1',
    message: { role: 'user', content: '拉取最新版' },
  }),
  JSON.stringify({
    type: 'assistant',
    timestamp: '2026-08-02T14:58:38.000Z',
    sessionId: 's1',
    message: {
      id: 'm1',
      model: 'claude-opus-5',
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'git pull' },
        { type: 'tool_use', id: 'tooluse_1', name: 'Bash', input: { command: 'git pull' } },
      ],
    },
  }),
  JSON.stringify({
    type: 'user',
    timestamp: '2026-08-02T14:58:39.000Z',
    sessionId: 's1',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tooluse_1', content: 'Already up to date.' }],
    },
  }),
  JSON.stringify({
    type: 'assistant',
    timestamp: '2026-08-02T14:58:40.000Z',
    sessionId: 's1',
    message: {
      id: 'm2',
      model: 'claude-opus-5',
      role: 'assistant',
      content: [{ type: 'text', text: '已经是最新。' }],
    },
  }),
  JSON.stringify({ type: 'ai-title', aiTitle: '拉取仓库', sessionId: 's1' }),
].join('\n')

test('converts a Claude Code tool loop', () => {
  const converted = convertClaudeSession(session, '/tmp/s1.jsonl')
  assert.equal(converted.source, 'claude')
  assert.equal(converted.nativeId, 's1')
  assert.equal(converted.title, '拉取仓库')
  assert.equal(converted.header.cwd, '/tmp/proj')
  const types = converted.events.map(event => event.type)
  assert.ok(types.includes('tool/call'))
  assert.ok(types.includes('tool/result'))
  const assistant = converted.events.find(event => event.type === 'assistant/message')
  assert.match(JSON.stringify(assistant?.data), /git pull/)
  const result = converted.events.find(event => event.type === 'tool/result')
  assert.match(JSON.stringify(result?.data), /Already up to date/)
})

test('recovers cwd from the Claude projects folder slug', () => {
  const converted = convertClaudeSession(
    JSON.stringify({ type: 'user', sessionId: 's2', timestamp: '2026-08-02T14:58:37.721Z', message: { role: 'user', content: 'hi' } }),
    '/Users/me/.claude/projects/-Volumes-ExternalData-Projects-CodexInstall/s2.jsonl',
  )
  assert.equal(converted.header.cwd, '/Volumes/ExternalData/Projects/CodexInstall')
})
