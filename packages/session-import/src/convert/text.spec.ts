import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeArguments, epochMs, fallbackTitle, flattenText, isInstructionDump, kebabName, parseTime, truncateChars } from './text.ts'

test('truncateChars keeps a short string', () => {
  assert.equal(truncateChars('hello', 10), 'hello')
})

test('truncateChars adds an ellipsis', () => {
  assert.equal(truncateChars('hello world', 8), 'hello w…')
})

test('flattenText joins text blocks and skips tool_use', () => {
  assert.equal(flattenText([
    { type: 'text', text: 'hi' },
    { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
    { type: 'thinking', thinking: 'plan' },
  ]), 'hi\nplan')
})

test('parseTime accepts ISO and epoch milliseconds', () => {
  assert.equal(parseTime('2026-08-02T14:58:37.721Z'), Date.parse('2026-08-02T14:58:37.721Z'))
  assert.equal(parseTime(1_700_000_000_000), 1_700_000_000_000)
})

test('epochMs rejects fractional filesystem times', () => {
  assert.equal(epochMs(1785912076190.5608), 1785912076191)
  assert.equal(epochMs(Number.NaN, 10), 10)
})

test('encodeArguments keeps a JSON string', () => {
  assert.equal(encodeArguments('{"a":1}'), '{"a":1}')
  assert.equal(encodeArguments({ a: 1 }), '{"a":1}')
})

test('instruction dumps are recognized', () => {
  assert.equal(isInstructionDump('# AGENTS.md instructions\n'), true)
  assert.equal(isInstructionDump('部署了没'), false)
})

test('kebabName accepts skill ids', () => {
  assert.equal(kebabName('Define Goal.md'), 'define-goal')
  assert.equal(kebabName('???'), undefined)
})

test('fallbackTitle collapses whitespace', () => {
  assert.equal(fallbackTitle('  pull\nlatest  '), 'pull latest')
})
