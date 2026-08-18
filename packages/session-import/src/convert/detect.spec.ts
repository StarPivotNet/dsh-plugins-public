import assert from 'node:assert/strict'
import test from 'node:test'
import { detectSource } from './detect.ts'

test('detects Claude by path and record type', () => {
  assert.equal(detectSource('/Users/a/.claude/projects/-tmp/s.jsonl', '{"type":"user"}'), 'claude')
  assert.equal(detectSource('/tmp/s.jsonl', '{"type":"user","sessionId":"s"}'), 'claude')
})

test('detects Codex by rollout path and session_meta', () => {
  assert.equal(detectSource('/Users/a/.codex/sessions/2026/08/01/rollout-x.jsonl', '{}'), 'codex')
  assert.equal(detectSource('/tmp/x.jsonl', '{"type":"session_meta"}'), 'codex')
})

test('detects Cursor by composer fields', () => {
  assert.equal(detectSource('/tmp/x.json', '{"composerId":"c1","conversation":[]}'), 'cursor')
})

test('detects Grok Build by path and ACP updates', () => {
  assert.equal(detectSource('/Users/a/.grok/sessions/%2Ftmp/01abc/updates.jsonl', '{}'), 'grok')
  assert.equal(detectSource('/tmp/updates.jsonl', '{"method":"session/update","params":{}}'), 'grok')
})

test('detects ZCode by sqlite locator and v2 JSON', () => {
  assert.equal(detectSource('zcode-sqlite:///tmp/db.sqlite#sess_1', ''), 'zcode')
  assert.equal(
    detectSource('/Users/a/.zcode/v2/sessions/abc/claude-import-1.json', '{"meta":{"taskId":"t1"},"messages":[]}'),
    'zcode',
  )
})
