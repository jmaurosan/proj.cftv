import test from 'node:test'
import assert from 'node:assert/strict'
import { compareSchemaVersions, evaluateSchemaVersion, REQUIRED_SCHEMA_VERSION } from '../src/lib/schemaVersion.ts'

test('compara versoes numericamente, inclusive revisoes com dois digitos', () => {
  assert.equal(compareSchemaVersions('2026.08.26.10', '2026.08.26.3'), 1)
  assert.equal(compareSchemaVersions('2026.08.26.2', '2026.08.26.3'), -1)
  assert.equal(compareSchemaVersions(REQUIRED_SCHEMA_VERSION, REQUIRED_SCHEMA_VERSION), 0)
})

test('bloqueia quando a versao nao pode ser confirmada', () => {
  const result = evaluateSchemaVersion(null)
  assert.equal(result.compatible, false)
  assert.match(result.message, /confirmar a vers[aã]o do banco/i)
})

test('libera somente a versao minima ou superior', () => {
  assert.equal(evaluateSchemaVersion('2026.08.26.2').compatible, false)
  assert.equal(evaluateSchemaVersion(REQUIRED_SCHEMA_VERSION).compatible, true)
})
