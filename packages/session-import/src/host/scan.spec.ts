import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_LIST_LIMIT,
  defaultScanRoots,
  discoverSessions,
  enrichFromPreview,
  filterDiscovered,
  isSessionFile,
  nativeIdFromName,
  presentSessions,
  readPreview,
} from './scan.ts'
import type { DiscoveredSession } from '../convert/types.ts'

test('isSessionFile accepts Codex rollouts and Claude JSONL', () => {
  assert.equal(isSessionFile('codex', 'rollout-2026-08-04T22-14-45-abc.jsonl'), true)
  assert.equal(isSessionFile('codex', 'notes.txt'), false)
  assert.equal(isSessionFile('claude', '189bf47b-452d-4272-94d9.jsonl'), true)
  assert.equal(isSessionFile('cursor', 'composer.json'), true)
  assert.equal(isSessionFile('cursor', 'state.json'), false)
})

test('nativeIdFromName strips the Codex rollout timestamp prefix', () => {
  assert.equal(
    nativeIdFromName('codex', 'rollout-2026-08-04T22-14-45-019fcd20-7a35-7363-87e1-b67c90c92b08.jsonl'),
    '019fcd20-7a35-7363-87e1-b67c90c92b08',
  )
})

test('discoverSessions finds nested conversation files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-import-scan-'))
  const nested = join(root, '2026', '08', '04')
  await mkdir(nested, { recursive: true })
  const path = join(nested, 'rollout-2026-08-04T22-14-45-abc.jsonl')
  await writeFile(path, '{"type":"session_meta","payload":{"id":"abc","thread_name":"Hello"}}\n')
  const found = await discoverSessions({ claude: [], codex: [root], cursor: [] })
  assert.equal(found.length, 1)
  assert.equal(found[0]?.source, 'codex')
  assert.equal(found[0]?.path, path)
})

test('presentSessions enriches only the newest limit and skips oversized files', async () => {
  const rows: DiscoveredSession[] = [
    session('old', 1, 100),
    session('new', 3, 100),
    session('huge', 4, 9_000),
    session('mid', 2, 100),
  ]
  const presented = await presentSessions(rows, {
    maxFileBytes: 1000,
    limit: 2,
    readPreview: async (path) => JSON.stringify({
      type: 'session_meta',
      payload: { id: path, thread_name: `title-${path}` },
    }),
  })
  assert.equal(presented.total, 3)
  assert.deepEqual(presented.entries.map(row => row.path), ['new', 'mid'])
  assert.equal(presented.entries[0]?.title, 'title-new')
  assert.equal(presented.entries[0]?.nativeId, 'new')
})

test('filterDiscovered matches title, path, and native id', () => {
  const rows = [session('keep-me', 2, 10, 'Keep this'), session('other', 1, 10, 'Ignore')]
  const filtered = filterDiscovered(rows, 100, 'keep')
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0]?.nativeId, 'keep-me')
})

test('readPreview returns only the file head', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-import-preview-'))
  const path = join(root, 'rollout-2026-08-04T22-14-45-abc.jsonl')
  await writeFile(path, `${'x'.repeat(200)}TAIL`)
  const preview = await readPreview(path, 20)
  assert.equal(preview.length, 20)
  assert.equal(preview.includes('TAIL'), false)
})

test('enrichFromPreview reads Claude user text and Codex session_meta', () => {
  const claude = enrichFromPreview(session('s1', 1, 10), [
    '{"type":"user","sessionId":"real","cwd":"/tmp/proj","message":{"content":"Fix the importer"}}',
  ].join('\n'))
  assert.equal(claude.nativeId, 'real')
  assert.equal(claude.cwd, '/tmp/proj')
  assert.equal(claude.title, 'Fix the importer')

  const codex = enrichFromPreview(session('s2', 1, 10), [
    '{"type":"session_meta","payload":{"id":"native","cwd":"/tmp/codex","thread_name":"Named thread"}}',
  ].join('\n'))
  assert.equal(codex.nativeId, 'native')
  assert.equal(codex.cwd, '/tmp/codex')
  assert.equal(codex.title, 'Named thread')
})

test('default list limit stays small enough for the Settings page', () => {
  assert.equal(DEFAULT_LIST_LIMIT, 300)
})

test('defaultScanRoots skips Codex archives unless asked', () => {
  const active = defaultScanRoots('/tmp/home')
  assert.deepEqual(active.codex, ['/tmp/home/.codex/sessions'])
  const archived = defaultScanRoots('/tmp/home', true)
  assert.ok(archived.codex.some(path => path.endsWith('archived_sessions')))
})

function session(id: string, updatedAt: number, bytes: number, title = id): DiscoveredSession {
  return {
    source: 'codex',
    nativeId: id,
    path: id,
    title,
    createdAt: updatedAt,
    updatedAt,
    bytes,
  }
}
