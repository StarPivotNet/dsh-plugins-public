import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  discoverAutomations,
  discoverMemories,
  importMemories,
  mapRrule,
  parseAutomationToml,
  parseSimpleToml,
} from './compat.ts'

test('mapRrule converts daily and weekly local clocks', () => {
  assert.deepEqual(mapRrule('RRULE:FREQ=WEEKLY;BYHOUR=2;BYMINUTE=0;BYDAY=SU,MO,TU,WE,TH,FR,SA'), {
    kind: 'local-clock',
    time: '02:00',
    timeZone: 'Asia/Shanghai',
  })
  assert.deepEqual(mapRrule('RRULE:FREQ=WEEKLY;BYHOUR=9;BYMINUTE=30;BYDAY=MO,WE'), {
    kind: 'local-clock',
    time: '09:30',
    weekdays: [1, 3],
    timeZone: 'Asia/Shanghai',
  })
})

test('mapRrule converts 5-minute heartbeats and rejects faster ones', () => {
  assert.deepEqual(mapRrule('RRULE:FREQ=MINUTELY;INTERVAL=5'), { kind: 'every', everySeconds: 300 })
  assert.equal(mapRrule('RRULE:FREQ=MINUTELY;INTERVAL=1').kind, 'unsupported')
})

test('parseAutomationToml reads Codex cron files', () => {
  const parsed = parseAutomationToml([
    'id = "fac-newapi"',
    'name = "FAC newapi"',
    'status = "ACTIVE"',
    'rrule = "RRULE:FREQ=WEEKLY;BYHOUR=2;BYMINUTE=0;BYDAY=MO"',
    'cwds = ["/Volumes/ExternalData/Projects/fac"]',
    'prompt = "do the work\nand report"',
  ].join('\n'), '/tmp/fac-newapi/automation.toml')
  assert.equal(parsed?.nativeId, 'fac-newapi')
  assert.equal(parsed?.cwd, '/Volumes/ExternalData/Projects/fac')
  assert.equal(parsed?.schedule.kind, 'local-clock')
  assert.match(parsed?.prompt ?? '', /do the work/)
})

test('discoverMemories and importMemories merge agent files once', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-import-memory-'))
  await mkdir(join(home, '.claude'), { recursive: true })
  await mkdir(join(home, '.codex'), { recursive: true })
  await writeFile(join(home, '.claude', 'CLAUDE.md'), 'Always reply in Chinese\n')
  await writeFile(join(home, '.codex', 'AGENTS.md'), '# Codex\nUse worktrees\n')
  const found = await discoverMemories(home)
  assert.equal(found.length, 2)
  const first = await importMemories(found.map(row => row.path), home)
  assert.equal(first.copied, 2)
  assert.equal(first.merged, 2)
  const agents = await readFile(join(home, '.dsh', 'AGENTS.md'), 'utf8')
  assert.match(agents, /Always reply in Chinese/)
  assert.match(agents, /Use worktrees/)
  const second = await importMemories(found.map(row => row.path), home)
  assert.equal(second.merged, 2)
  const again = await readFile(join(home, '.dsh', 'AGENTS.md'), 'utf8')
  assert.equal(again.split('Always reply in Chinese').length - 1, 1)
})

test('discoverAutomations skips files without a prompt', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-import-auto-'))
  await mkdir(join(home, '.codex', 'automations', 'empty'), { recursive: true })
  await mkdir(join(home, '.codex', 'automations', 'ok'), { recursive: true })
  await writeFile(join(home, '.codex', 'automations', 'empty', 'automation.toml'), 'id = "empty"\nname = "Empty"\n')
  await writeFile(join(home, '.codex', 'automations', 'ok', 'automation.toml'), [
    'id = "ok"',
    'name = "Ok"',
    'status = "PAUSED"',
    'rrule = "RRULE:FREQ=MINUTELY;INTERVAL=5"',
    'prompt = "check sessions"',
  ].join('\n'))
  const found = await discoverAutomations(home)
  assert.equal(found.length, 1)
  assert.equal(found[0]?.nativeId, 'ok')
  assert.deepEqual(found[0]?.schedule, { kind: 'every', everySeconds: 300 })
})

test('parseSimpleToml keeps quoted escaped newlines', () => {
  const fields = parseSimpleToml('prompt = "line1\\nline2"\nstatus = "ACTIVE"\n')
  assert.equal(fields.status, 'ACTIVE')
  assert.equal(fields.prompt, 'line1\nline2')
})
