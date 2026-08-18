import { strict as assert } from 'node:assert'
import { shouldSeedSteer } from '../lib/logic.js'

assert.equal(shouldSeedSteer(undefined), true)
assert.equal(shouldSeedSteer(null), true)
assert.equal(shouldSeedSteer({}), true)
assert.equal(shouldSeedSteer({ other: 1 }), true)
assert.equal(shouldSeedSteer({ busyEnter: 'queue' }), false)
assert.equal(shouldSeedSteer({ busyEnter: 'steer' }), false)
assert.equal(shouldSeedSteer([]), true)
console.log('should-seed.test.mjs: ok')
