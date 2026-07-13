import assert from 'node:assert/strict'
import test from 'node:test'

import { createTimedCache } from '../src/lib/timedCache.ts'

test('returns cached values only while the ttl is valid', () => {
  let now = 1_000
  const cache = createTimedCache<string>(500, () => now)

  cache.set('client-1', 'assets')
  assert.equal(cache.get('client-1'), 'assets')

  now = 1_501
  assert.equal(cache.get('client-1'), undefined)
})

test('invalidates individual keys without affecting other clients', () => {
  const cache = createTimedCache<number>(1_000, () => 10)
  cache.set('client-1', 1)
  cache.set('client-2', 2)

  cache.delete('client-1')

  assert.equal(cache.get('client-1'), undefined)
  assert.equal(cache.get('client-2'), 2)
})
