import test from 'node:test'
import assert from 'node:assert/strict'
import { isMutationAction } from '../src/lib/demoReadOnly.ts'

test('bloqueia submits e ações de mutação no modo viewer', () => {
  assert.equal(isMutationAction('Filtrar', 'submit'), true)
  assert.equal(isMutationAction('Novo DVR'), true)
  assert.equal(isMutationAction('Salvar topologia'), true)
  assert.equal(isMutationAction('Excluir'), true)
})

test('mantém navegação, filtros e seleção disponíveis', () => {
  assert.equal(isMutationAction('Câmeras'), false)
  assert.equal(isMutationAction('Buscar mídias'), false)
  assert.equal(isMutationAction('Selecionar cliente'), false)
  assert.equal(isMutationAction('Tela cheia'), false)
})
