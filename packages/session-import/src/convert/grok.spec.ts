import assert from 'node:assert/strict'
import test from 'node:test'
import { convertGrokSession, parseGrokSummary } from './grok.ts'

test('parseGrokSummary reads generated title and cwd', () => {
  const summary = parseGrokSummary(JSON.stringify({
    info: { id: '01abc', cwd: '/tmp/proj' },
    generated_title: 'Merge upstream',
    current_model_id: 'grok-4.6',
    created_at: '2026-08-16T09:49:57.450774Z',
    updated_at: '2026-08-18T05:46:46.583711Z',
  }))
  assert.equal(summary.id, '01abc')
  assert.equal(summary.cwd, '/tmp/proj')
  assert.equal(summary.title, 'Merge upstream')
  assert.equal(summary.model, 'grok-4.6')
})

test('convertGrokSession folds ACP updates into a balanced turn', () => {
  const text = [
    JSON.stringify({
      timestamp: 1786873817,
      method: 'session/update',
      params: {
        sessionId: '01abc',
        update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'pull upstream' } },
      },
    }),
    JSON.stringify({
      timestamp: 1786873823,
      method: 'session/update',
      params: {
        sessionId: '01abc',
        update: { sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'planning' } },
      },
    }),
    JSON.stringify({
      timestamp: 1786873825,
      method: 'session/update',
      params: {
        sessionId: '01abc',
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'checking remotes' } },
      },
    }),
    JSON.stringify({
      timestamp: 1786873825,
      method: 'session/update',
      params: {
        sessionId: '01abc',
        update: { sessionUpdate: 'tool_call', toolCallId: 'c1', title: 'run_terminal_command', rawInput: { command: 'git status' } },
      },
    }),
    JSON.stringify({
      timestamp: 1786873828,
      method: 'session/update',
      params: {
        sessionId: '01abc',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'c1',
          status: 'completed',
          content: [{ type: 'content', content: { type: 'text', text: 'clean' } }],
        },
      },
    }),
  ].join('\n')
  const converted = convertGrokSession(text, '/tmp/.grok/sessions/proj/01abc/updates.jsonl', undefined, {
    id: '01abc',
    title: 'Merge upstream',
    cwd: '/tmp/proj',
  })
  assert.equal(converted.source, 'grok')
  assert.equal(converted.header.id, 'import-grok-01abc')
  assert.equal(converted.title, 'Merge upstream')
  const types = converted.events.map(event => event.type)
  assert.ok(types.includes('user/message'))
  assert.ok(types.includes('assistant/message'))
  assert.ok(types.includes('tool/call'))
  assert.ok(types.includes('tool/result'))
  assert.ok(types.includes('session/title'))
})
