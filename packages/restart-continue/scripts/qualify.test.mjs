import assert from 'node:assert/strict'
import {
  alreadyContinued,
  foldInterruption,
  foldLoggedRoute,
  isEligibleRoot,
  messageIsResumeNotice,
  normalizeEnabled,
  pickResumeSet,
  qualifySession,
} from '../lib/logic.js'

assert.equal(normalizeEnabled(undefined), true)
assert.equal(normalizeEnabled(true), true)
assert.equal(normalizeEnabled(false), false)

assert.equal(isEligibleRoot({ cwd: '/tmp/p' }), true)
assert.equal(isEligibleRoot({ cwd: '/tmp/p', origin: 'subagent' }), false)
assert.equal(isEligibleRoot({ cwd: '/tmp/p', origin: 'automation' }), false)
assert.equal(isEligibleRoot({}), false)

const open = [
  { type: 'turn/start', time: 10, data: { turn: 1 } },
]
assert.deepEqual(foldInterruption(open), { interrupted: true, at: 10 })

const closedInterrupted = [
  { type: 'turn/start', time: 10, data: { turn: 1 } },
  { type: 'turn/end', time: 20, data: { turn: 1, reason: { kind: 'interrupted' } } },
]
assert.deepEqual(foldInterruption(closedInterrupted), { interrupted: true, at: 20 })

const completed = [
  { type: 'turn/start', time: 10, data: { turn: 1 } },
  { type: 'turn/end', time: 20, data: { turn: 1, reason: { kind: 'completed' } } },
]
assert.deepEqual(foldInterruption(completed), { interrupted: false, at: null })

const laterTurn = [
  ...closedInterrupted,
  { type: 'turn/start', time: 30, data: { turn: 2 } },
  { type: 'turn/end', time: 40, data: { turn: 2, reason: { kind: 'completed' } } },
]
assert.deepEqual(foldInterruption(laterTurn), { interrupted: false, at: null })

assert.equal(alreadyContinued(closedInterrupted), false)
assert.equal(alreadyContinued([
  ...closedInterrupted,
  {
    type: 'user/message',
    time: 21,
    data: { source: { kind: 'plugin', plugin: 'dsh-host-apiproxy', form: 'notice' } },
  },
]), true)
assert.equal(alreadyContinued([
  ...closedInterrupted,
  {
    type: 'user/message',
    time: 21,
    data: { source: { kind: 'plugin', plugin: '@starpivot/dsh-restart-continue', form: 'notice' } },
  },
]), true)
assert.equal(messageIsResumeNotice({
  source: { kind: 'plugin', plugin: 'dsh-host-apiproxy', form: 'notice' },
}), true)
assert.equal(messageIsResumeNotice({ source: { kind: 'user' } }), false)

const header = { cwd: '/tmp/p' }
const now = 1000
assert.equal(qualifySession({ header, events: closedInterrupted }, { now: 20 + 1000 }).ok, true)
assert.equal(qualifySession({ header, events: closedInterrupted, archived: true }, { now }).reason, 'archived')
assert.equal(qualifySession({ header: { origin: 'subagent', cwd: '/tmp/p' }, events: closedInterrupted }, { now }).reason, 'not-root')
assert.equal(qualifySession({ header: { origin: 'automation', cwd: '/tmp/p' }, events: closedInterrupted }, { now }).reason, 'not-root')
assert.equal(qualifySession({ header, events: completed }, { now }).reason, 'not-interrupted')
assert.equal(qualifySession({
  header,
  events: [
    ...closedInterrupted,
    { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'dsh-host-apiproxy' } } },
  ],
}, { now: 21 }).reason, 'already-continued')
assert.equal(qualifySession({ header, events: closedInterrupted }, {
  now: 20 + 24 * 60 * 60 * 1000 + 1,
}).reason, 'stale')
assert.equal(qualifySession({ header, events: open }, { now: 10 + 1000 }).ok, true)

const picked = pickResumeSet([
  { id: 'old', at: 1 },
  { id: 'new', at: 3 },
  { id: 'mid', at: 2 },
], 2)
assert.deepEqual(picked.map(item => item.id), ['new', 'mid'])

assert.deepEqual(foldLoggedRoute([
  { type: 'request/header', data: { header: { config: { provider: 'p', model: 'm1' } } } },
  { type: 'request/header', data: { header: { config: { provider: 'p', model: 'm2', reasoningEffort: 'high' } } } },
]), { provider: 'p', model: 'm2', reasoningEffort: 'high' })
assert.equal(foldLoggedRoute(closedInterrupted), undefined)

console.log('ok')
