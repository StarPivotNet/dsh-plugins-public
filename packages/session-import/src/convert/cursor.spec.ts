import assert from 'node:assert/strict'
import test from 'node:test'
import { convertCursorSession } from './cursor.ts'

test('converts a Cursor composer JSON document', () => {
  const converted = convertCursorSession(JSON.stringify({
    composerId: 'cmp_1',
    name: 'Fix login',
    createdAt: '2026-08-01T00:00:00.000Z',
    conversation: [
      { type: 'user', text: 'fix the login button', createdAt: '2026-08-01T00:00:00.000Z' },
      {
        type: 'ai',
        text: 'I will inspect it.',
        createdAt: '2026-08-01T00:00:01.000Z',
        toolCalls: [{ toolCallId: 't1', name: 'read_file', rawArgs: { path: 'app.ts' } }],
      },
      { type: 'tool_result', toolCallId: 't1', result: 'export function login() {}', createdAt: '2026-08-01T00:00:02.000Z' },
    ],
  }), '/tmp/cmp_1.json')
  assert.equal(converted.source, 'cursor')
  assert.equal(converted.nativeId, 'cmp_1')
  assert.equal(converted.title, 'Fix login')
  assert.ok(converted.events.some(event => event.type === 'tool/call'))
  assert.ok(converted.events.some(event => event.type === 'tool/result'))
})

test('converts a Cursor agent-transcript JSONL file', () => {
  const converted = convertCursorSession([
    JSON.stringify({ composerId: 'cmp_2', type: 'user', text: 'hello', timestamp: '2026-08-01T00:00:00.000Z' }),
    JSON.stringify({ type: 'assistant', text: 'hi', timestamp: '2026-08-01T00:00:01.000Z' }),
  ].join('\n'), '/tmp/agent-transcript.jsonl')
  assert.equal(converted.nativeId, 'cmp_2')
  assert.equal(converted.events.filter(event => event.type === 'user/message').length, 1)
  assert.equal(converted.events.filter(event => event.type === 'assistant/message').length, 1)
})
