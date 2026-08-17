import assert from 'node:assert/strict'
import test from 'node:test'
import { parseImportArgs } from './parse-args.ts'

test('empty input is help', () => {
  assert.deepEqual(parseImportArgs(''), { kind: 'help' })
})

test('list accepts an optional source', () => {
  assert.deepEqual(parseImportArgs('list'), { kind: 'list', source: undefined })
  assert.deepEqual(parseImportArgs('list claude'), { kind: 'list', source: 'claude' })
})

test('all imports every store', () => {
  assert.deepEqual(parseImportArgs('all'), { kind: 'sessions', keepCwd: false })
})

test('source plus query selects one conversation', () => {
  assert.deepEqual(parseImportArgs('codex abc'), { kind: 'sessions', source: 'codex', query: 'abc', keepCwd: false })
})

test('skills imports skill files', () => {
  assert.deepEqual(parseImportArgs('skills cursor'), { kind: 'skills', source: 'cursor' })
})

test('an absolute path is a session query', () => {
  assert.deepEqual(parseImportArgs('/tmp/s.jsonl'), { kind: 'sessions', query: '/tmp/s.jsonl', keepCwd: false })
})

test('keep-cwd is stripped from the query', () => {
  assert.deepEqual(parseImportArgs('all --keep-cwd'), { kind: 'sessions', keepCwd: true })
})
