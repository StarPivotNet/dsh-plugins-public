import assert from 'node:assert/strict'
import test from 'node:test'
import { convertConversation } from './events.ts'
import type { TranscriptConversation } from './types.ts'

function conversation(items: TranscriptConversation['items']): TranscriptConversation {
  return {
    source: 'claude',
    nativeId: 'abc',
    createdAt: 1,
    updatedAt: 9,
    items,
  }
}

test('user then assistant becomes one balanced turn', () => {
  const converted = convertConversation(conversation([
    { kind: 'user', time: 1, text: 'hi', source: 'user' },
    { kind: 'assistant', time: 2, text: 'hello', reasoning: '', toolCalls: [] },
  ]), '/tmp/a.jsonl')
  const types = converted.events.map(event => event.type)
  assert.deepEqual(types, [
    'turn/start', 'user/message', 'step/start', 'assistant/message', 'step/end', 'turn/end', 'session/title',
  ])
  assert.equal(converted.header.id, 'import-claude-abc')
  assert.equal(converted.title, 'hi')
})

test('tool calls stay inside one step until results arrive', () => {
  const converted = convertConversation(conversation([
    { kind: 'user', time: 1, text: 'run', source: 'user' },
    { kind: 'assistant', time: 2, text: '', reasoning: 'plan', toolCalls: [{ callId: 'c1', name: 'Bash', arguments: '{"command":"ls"}' }] },
    { kind: 'assistant', time: 3, text: '', reasoning: '', toolCalls: [{ callId: 'c2', name: 'Read', arguments: '{"path":"a"}' }] },
    { kind: 'tool-result', time: 4, callId: 'c1', text: 'ok', isError: false },
    { kind: 'tool-result', time: 5, callId: 'c2', text: 'file', isError: false },
    { kind: 'assistant', time: 6, text: 'done', reasoning: '', toolCalls: [] },
  ]), '/tmp/a.jsonl')
  const types = converted.events.map(event => event.type)
  assert.deepEqual(types, [
    'turn/start', 'user/message',
    'step/start', 'tool/call', 'assistant/message', 'tool/call', 'assistant/message',
    'tool/result', 'tool/result', 'step/end',
    'step/start', 'assistant/message', 'step/end',
    'turn/end', 'session/title',
  ])
  const missing = converted.events.filter(event => event.type === 'tool/result' && JSON.stringify(event.data).includes('no recorded result'))
  assert.equal(missing.length, 0)
})

test('unfinished tool calls receive a synthetic result before turn/end', () => {
  const converted = convertConversation(conversation([
    { kind: 'user', time: 1, text: 'run', source: 'user' },
    { kind: 'assistant', time: 2, text: '', reasoning: '', toolCalls: [{ callId: 'c1', name: 'Bash', arguments: '{}' }] },
  ]), '/tmp/a.jsonl')
  const result = converted.events.find(event => event.type === 'tool/result')
  assert.ok(result)
  assert.match(JSON.stringify(result.data), /no recorded result/)
  assert.equal(converted.events.at(-2)?.type, 'turn/end')
})
