import { useState, useEffect } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { generateReport } from '../lib/reportGenerator'
import type { Dvr, Camera, Switch, PowerBalun, CableConnection } from '../lib/types'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface QuickStats {
  dvrs: number
  cameras: number
  camerasIP: number
  switches: number
  switchesPoe: number
  baluns: number
  cables: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [clientName, setClientName] = useState(() => localStorage.getItem('report_client') || '')
  const [projectName, setProjectName] = useState(() => localStorage.getItem('report_project') || '')
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function loadStats() {
      const [dvrs, cameras, switches, baluns, cables] = await Promise.all([
        supabase.from('dvrs').select('id'),
        supabase.from('cameras').select('id, connection_type'),
        supabase.from('switches').select('id, is_poe'),
        supabase.from('power_baluns').select('id'),
        supabase.from('cable_connections').select('id'),
      ])
      setStats({
        dvrs: dvrs.data?.length ?? 0,
        cameras: cameras.data?.length ?? 0,
        camerasIP: cameras.data?.filter(c => c.connection_type === 'ip').length ?? 0,
        switches: switches.data?.length ?? 0,
        switchesPoe: switches.data?.filter(s => s.is_poe).length ?? 0,
        baluns: baluns.data?.length ?? 0,
        cables: cables.data?.length ?? 0,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('report_client', clientName)
  }, [clientName])
  useEffect(() => {
    localStorage.setItem('report_project', projectName)
  }, [projectName])

  const handleGenerate = async () => {
    if (!clientName.trim() || !projectName.trim()) return
    setGenerating(true)

    try {
      const [dvrsRes, camerasRes, switchesRes, balunsRes, cablesRes] = await Promise.all([
        supabase.from('dvrs').select('*').order('name'),
        supabase.from('cameras').select('*, dvrs(name)').order('name'),
        supabase.from('switches').select('*').order('name'),
        supabase.from('power_baluns').select('*').order('name'),
        supabase.from('cable_connections').select('*'),
      ])

      const dvrs = (dvrsRes.data || []) as Dvr[]
      const cameras = (camerasRes.data || []) as Camera[]
      const switches = (switchesRes.data || []) as Switch[]
      const baluns = (balunsRes.data || []) as PowerBalun[]
      const rawCables = (cablesRes.data || []) as CableConnection[]

      // Enrich cables with camera names
      const cameraMap = new Map(cameras.map(c => [c.id, c.name]))
      const cables = rawCables.map(cable => ({
        ...cable,
        camera_name: cameraMap.get(cable.camera_id) || 'Camera desconhecida',
      }))

      generateReport({
        dvrs,
        cameras,
        switches,
        baluns,
        cables,
        userEmail: user?.email || 'N/A',
        clientName: clientName.trim(),
        projectName: projectName.trim(),
      })
    } catch (err) {
      console.error('Erro ao gerar relatorio:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Relatorios</h2>
        <p className="text-text-muted text-sm mt-1">Gere relatorios PDF profissionais da sua infraestrutura</p>
      </div>

      {/* Form Card */}
      <div className="bg-bg-secondary border border-border-light rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Relatorio de Infraestrutura</h3>
            <p className="text-xs text-text-muted">Documento completo com inventario, cabeamento e status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome do Cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Empresa ABC Ltda"
            required
          />
          <Input
            label="Nome do Projeto"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ex: CFTV Matriz - Fase 1"
            required
          />
        </div>

        {/* Stats Preview */}
        {stats && (
          <div>
            <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wide">O relatorio incluira:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Cameras" value={stats.cameras} subtitle={`${stats.camerasIP} IP`} icon={FileText} color="text-cyan-400" />
              <StatCard label="DVRs" value={stats.dvrs} icon={FileText} color="text-indigo-400" />
              <StatCard label="Switches" value={stats.switches} subtitle={`${stats.switchesPoe} PoE`} icon={FileText} color="text-emerald-400" />
              <StatCard label="Fichas Cabo" value={stats.cables} icon={FileText} color="text-purple-400" />
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || !clientName.trim() || !projectName.trim()}
            className="w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gerar Relatorio PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-bg-secondary/50 border border-border-light rounded-xl p-5">
        <h4 className="text-sm font-semibold text-text-primary mb-2">O que esta incluso no relatorio:</h4>
        <ul className="space-y-1.5 text-sm text-text-muted">
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">1.</span> Resumo da infraestrutura com totais de equipamentos</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">2.</span> Graficos de integridade (status de cameras, DVRs e switches)</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">3.</span> Inventario completo de todos os equipamentos</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">4.</span> Ficha de conectividade com mapa de cores dos cabos</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">5.</span> Log de instalacao com snapshot de status e area de assinatura</li>
        </ul>
      </div>
    </div>
  )
}
