import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sourceFiles = [
  'src/pages/Dashboard.tsx',
  'src/pages/IpPlanningPage.tsx',
  'src/pages/NetworkDiagnosticsPage.tsx',
  'src/components/NetworkTopology.tsx',
]

test('não consulta o IP legado removido da tabela switches', () => {
  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8')
    const switchSelects = source.match(/from\('switches'\)\.select\(([^)]*)\)/g) || []
    assert.equal(
      switchSelects.some(select => select.includes('ip_address')),
      false,
      `${file} ainda consulta switches.ip_address`,
    )
  }
})
