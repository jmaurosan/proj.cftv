import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_LOGIN_EMAIL, resolveLoginIdentifier } from '../src/lib/demoAuth.ts'

test('converte o usuário curto digixs no email interno somente no demo', () => {
  assert.equal(resolveLoginIdentifier('digixs', true), DEMO_LOGIN_EMAIL)
  assert.equal(resolveLoginIdentifier(' DIGIXS ', true), DEMO_LOGIN_EMAIL)
  assert.equal(resolveLoginIdentifier('digixs', false), 'digixs')
})

test('mantém emails normais inalterados', () => {
  assert.equal(resolveLoginIdentifier(' pessoa@exemplo.com ', true), 'pessoa@exemplo.com')
})
