import assert from 'node:assert/strict'
import test from 'node:test'
import { parseImportArgs } from './parse-args.ts'

test('empty input is help', () => {
  assert.deepEqual(parseImportArgs(''), { kind: 'help' })
})

test('list accepts an optional source', () => {
  assert.deepEqual(parseImportArgs('list'), { kind: 'list', source: undefined, includeArchived: false })
  assert.deepEqual(parseImportArgs('list claude'), { kind: 'list', source: 'claude', includeArchived: false })
})

test('all imports every store', () => {
  assert.deepEqual(parseImportArgs('all'), { kind: 'sessions', keepCwd: true, includeArchived: false })
})

test('source plus query selects one conversation', () => {
  assert.deepEqual(parseImportArgs('codex abc'), { kind: 'sessions', source: 'codex', query: 'abc', keepCwd: true, includeArchived: false })
})

test('skills imports skill files', () => {
  assert.deepEqual(parseImportArgs('skills cursor'), { kind: 'skills', source: 'cursor' })
})

test('memory and automations are dedicated commands', () => {
  assert.deepEqual(parseImportArgs('memory'), { kind: 'memory' })
  assert.deepEqual(parseImportArgs('automations'), { kind: 'automations' })
})

test('repair is a dedicated command', () => {
  assert.deepEqual(parseImportArgs('repair'), { kind: 'repair' })
})

test('an absolute path is a session query', () => {
  assert.deepEqual(parseImportArgs('/tmp/s.jsonl'), { kind: 'sessions', query: '/tmp/s.jsonl', keepCwd: true, includeArchived: false })
})

test('keep-cwd remains the default and --here rewrites into this workspace', () => {
  assert.deepEqual(parseImportArgs('all --keep-cwd'), { kind: 'sessions', keepCwd: true, includeArchived: false })
  assert.deepEqual(parseImportArgs('all --here'), { kind: 'sessions', keepCwd: false, includeArchived: false })
})

test('archived is stripped from the query', () => {
  assert.deepEqual(parseImportArgs('list --archived'), { kind: 'list', source: undefined, includeArchived: true })
})
