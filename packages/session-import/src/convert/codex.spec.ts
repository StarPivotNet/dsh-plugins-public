import assert from 'node:assert/strict'
import test from 'node:test'
import { convertCodexSession } from './codex.ts'

const session = [
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.379Z',
    type: 'session_meta',
    payload: { id: 'codex-1', cwd: '/tmp/fac', model_provider: 'openai', model: 'gpt-5.6' },
  }),
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.386Z',
    type: 'response_item',
    payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '部署了没' }] },
  }),
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.400Z',
    type: 'response_item',
    payload: { type: 'reasoning', summary: [{ type: 'summary_text', text: 'check status' }] },
  }),
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.410Z',
    type: 'response_item',
    payload: { type: 'function_call', call_id: 'call_1', name: 'exec', arguments: '{"cmd":"pwd"}' },
  }),
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.420Z',
    type: 'response_item',
    payload: { type: 'function_call_output', call_id: 'call_1', output: '/tmp/fac' },
  }),
  JSON.stringify({
    timestamp: '2026-08-05T11:53:13.430Z',
    type: 'response_item',
    payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '已经在跑。' }] },
  }),
].join('\n')

test('converts a Codex rollout tool loop', () => {
  const converted = convertCodexSession(session, '/tmp/rollout-codex-1.jsonl')
  assert.equal(converted.source, 'codex')
  assert.equal(converted.nativeId, 'codex-1')
  assert.equal(converted.header.cwd, '/tmp/fac')
  const user = converted.events.find(event => event.type === 'user/message')
  assert.match(JSON.stringify(user?.data), /部署了没/)
  const call = converted.events.find(event => event.type === 'tool/call')
  assert.match(JSON.stringify(call?.data), /exec/)
  const result = converted.events.find(event => event.type === 'tool/result')
  assert.match(JSON.stringify(result?.data), /\/tmp\/fac/)
})

test('marks AGENTS.md dumps as plugin instructions', () => {
  const converted = convertCodexSession([
    JSON.stringify({
      timestamp: '2026-08-05T11:53:13.379Z',
      type: 'session_meta',
      payload: { id: 'codex-2' },
    }),
    JSON.stringify({
      timestamp: '2026-08-05T11:53:13.386Z',
      type: 'response_item',
      payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '# AGENTS.md instructions\n\nBe concise.' }] },
    }),
  ].join('\n'), '/tmp/rollout-codex-2.jsonl')
  const user = converted.events.find(event => event.type === 'user/message')
  assert.match(JSON.stringify(user?.data), /"kind":"plugin"/)
})
