import { useEffect, useState } from 'react'
import { Server, Camera, Cable, Network, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Stats {
  dvrs: { total: number; ativos: number }
  cameras: { total: number; ativos: number }
  baluns: { total: number; ativos: number }
  switches: { total: number; ativos: number }
  credentials: { total: number }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const [dvrs, cameras, baluns, switches, credentials] = await Promise.all([
        supabase.from('dvrs').select('id, status'),
        supabase.from('cameras').select('id, status'),
        supabase.from('power_baluns').select('id, status'),
        supabase.from('switches').select('id, status'),
        supabase.from('credentials').select('id'),
      ])

      setStats({
        dvrs: {
          total: dvrs.data?.length ?? 0,
          ativos: dvrs.data?.filter((d) => d.status === 'ativo').length ?? 0,
        },
        cameras: {
          total: cameras.data?.length ?? 0,
          ativos: cameras.data?.filter((c) => c.status === 'ativo').length ?? 0,
        },
        baluns: {
          total: baluns.data?.length ?? 0,
          ativos: baluns.data?.filter((b) => b.status === 'ativo').length ?? 0,
        },
        switches: {
          total: switches.data?.length ?? 0,
          ativos: switches.data?.filter((s) => s.status === 'ativo').length ?? 0,
        },
        credentials: { total: credentials.data?.length ?? 0 },
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  if (loading) return <LoadingSpinner />

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Visão Geral</h2>
        <p className="text-text-muted text-sm mt-1">Resumo da infraestrutura de CFTV</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="DVRs"
          value={stats.dvrs.total}
          subtitle={`${stats.dvrs.ativos} ativos`}
          icon={Server}
          color="text-cyan-400"
        />
        <StatCard
          label="Câmeras"
          value={stats.cameras.total}
          subtitle={`${stats.cameras.ativos} ativas`}
          icon={Camera}
          color="text-blue-400"
        />
        <StatCard
          label="Power Baluns"
          value={stats.baluns.total}
          subtitle={`${stats.baluns.ativos} ativos`}
          icon={Cable}
          color="text-purple-400"
        />
        <StatCard
          label="Switches"
          value={stats.switches.total}
          subtitle={`${stats.switches.ativos} ativos`}
          icon={Network}
          color="text-emerald-400"
        />
        <StatCard
          label="Credenciais"
          value={stats.credentials.total}
          icon={KeyRound}
          color="text-amber-400"
        />
      </div>
    </div>
  )
}
