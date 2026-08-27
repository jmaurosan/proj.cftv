import { useMemo } from 'react'
import Select from './Select'
import { useSites } from '../../hooks/useSites'
import { useSiteTypes } from '../../hooks/useSiteTypes'
import type { InstallationSite } from '../../lib/types'

interface SiteSelectorProps {
  value: string
  onChange: (siteId: string) => void
  label?: string
  helpText?: string
}

/**
 * Monta rótulo hierárquico: "Bloco A › Elevador 1" para facilitar identificação.
 */
function buildHierarchicalLabel(site: InstallationSite, sites: InstallationSite[]): string {
  const parts: string[] = []
  let current: InstallationSite | undefined = site
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    parts.unshift(current.name)
    current = current.parent_site_id ? sites.find((s) => s.id === current!.parent_site_id) : undefined
  }
  return parts.join(' › ')
}

export default function SiteSelector({
  value,
  onChange,
  label = 'Local (site)',
  helpText = 'Opcional. Vincule a um elevador, bloco ou local cadastrado em Locais.',
}: SiteSelectorProps) {
  const { data: sites, loading } = useSites()
  const { options: siteTypes, loading: loadingTypes } = useSiteTypes()

  const options = useMemo(() => {
    const sorted = [...sites].sort((a, b) => {
      const la = buildHierarchicalLabel(a, sites)
      const lb = buildHierarchicalLabel(b, sites)
      return la.localeCompare(lb, 'pt-BR')
    })
    return [
      { value: '', label: '— Sem local vinculado —' },
      ...sorted.map((s) => ({
        value: s.id,
        label: `${buildHierarchicalLabel(s, sites)} · ${siteTypes.find((type) => type.value === s.site_type)?.label ?? s.site_type}`,
      })),
    ]
  }, [sites, siteTypes])

  return (
    <div>
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        disabled={loading || loadingTypes}
      />
      {helpText && (
        <p className="text-xs text-text-muted mt-1">{helpText}</p>
      )}
    </div>
  )
}
