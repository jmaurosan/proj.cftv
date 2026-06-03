import { useState, useEffect } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useClient } from '../contexts/ClientContext'
import { generateReport } from '../lib/reportGenerator'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import type { Dvr, Camera, Switch, PowerBalun, CableConnection, Router, Credential } from '../lib/types'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useToast } from '../components/ui/Toast'

interface QuickStats {
  dvrs: number
  cameras: number
  camerasIP: number
  switches: number
  switchesPoe: number
  baluns: number
  cables: number
  routers: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()

  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState(() => localStorage.getItem('report_project') || '')
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Sincroniza o nome do cliente selecionado no banner com o formulário
  useEffect(() => {
    if (selectedClientName) {
      setClientName(selectedClientName)
    } else {
      const storedClient = localStorage.getItem('report_client') || ''
      setClientName(storedClient)
    }
  }, [selectedClientName])

  // Carregar estatísticas rápidas filtradas por cliente
  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        let dvrsQuery = supabase.from('dvrs').select('id')
        let camerasQuery = supabase.from('cameras').select('id, connection_type')
        let switchesQuery = supabase.from('switches').select('id, is_poe')
        let balunsQuery = supabase.from('power_baluns').select('id')
        let cablesQuery = supabase.from('cable_connections').select('id')
        let routersQuery = supabase.from('routers').select('id')

        if (selectedClientId) {
          dvrsQuery = dvrsQuery.eq('client_id', selectedClientId)
          camerasQuery = camerasQuery.eq('client_id', selectedClientId)
          switchesQuery = switchesQuery.eq('client_id', selectedClientId)
          balunsQuery = balunsQuery.eq('client_id', selectedClientId)
          cablesQuery = cablesQuery.eq('client_id', selectedClientId)
          routersQuery = routersQuery.eq('client_id', selectedClientId)
        }

        const [dvrs, cameras, switches, baluns, cables, routers] = await Promise.all([
          dvrsQuery,
          camerasQuery,
          switchesQuery,
          balunsQuery,
          cablesQuery,
          routersQuery
        ])

        setStats({
          dvrs: dvrs.data?.length ?? 0,
          cameras: cameras.data?.length ?? 0,
          camerasIP: cameras.data?.filter(c => c.connection_type === 'ip').length ?? 0,
          switches: switches.data?.length ?? 0,
          switchesPoe: switches.data?.filter(s => s.is_poe).length ?? 0,
          baluns: baluns.data?.length ?? 0,
          cables: cables.data?.length ?? 0,
          routers: routers.data?.length ?? 0,
        })
      } catch (err: any) {
        console.error('Erro ao carregar estatísticas:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [selectedClientId])

  // Persistir nome do projeto no localStorage
  useEffect(() => {
    localStorage.setItem('report_project', projectName)
  }, [projectName])

  const handleGenerate = async () => {
    if (!clientName.trim() || !projectName.trim()) return
    setGenerating(true)

    try {
      let dvrsQuery = supabase.from('dvrs').select('*').order('name')
      let camerasQuery = supabase.from('cameras').select('*, dvrs(name)').order('name')
      let switchesQuery = supabase.from('switches').select('*').order('name')
      let balunsQuery = supabase.from('power_baluns').select('*').order('name')
      let cablesQuery = supabase.from('cable_connections').select('*')
      let routersQuery = supabase.from('routers').select('*').order('name')
      let credentialsQuery = supabase.from('credentials').select('*').order('label')

      // Filtra por cliente se selecionado
      if (selectedClientId) {
        dvrsQuery = dvrsQuery.eq('client_id', selectedClientId)
        camerasQuery = camerasQuery.eq('client_id', selectedClientId)
        switchesQuery = switchesQuery.eq('client_id', selectedClientId)
        balunsQuery = balunsQuery.eq('client_id', selectedClientId)
        cablesQuery = cablesQuery.eq('client_id', selectedClientId)
        routersQuery = routersQuery.eq('client_id', selectedClientId)
        credentialsQuery = credentialsQuery.eq('client_id', selectedClientId)
      }

      const [dvrsRes, camerasRes, switchesRes, balunsRes, cablesRes, routersRes, credentialsRes] = await Promise.all([
        dvrsQuery,
        camerasQuery,
        switchesQuery,
        balunsQuery,
        cablesQuery,
        routersQuery,
        credentialsQuery
      ])

      const dvrs = (dvrsRes.data || []) as Dvr[]
      const cameras = (camerasRes.data || []) as Camera[]
      const switches = (switchesRes.data || []) as Switch[]
      const baluns = (balunsRes.data || []) as PowerBalun[]
      const routers = (routersRes.data || []) as Router[]
      const credentials = (credentialsRes.data || []) as Credential[]
      const rawCables = (cablesRes.data || []) as CableConnection[]

      // Enriquecer cabos com os nomes correspondentes das câmeras
      const cameraMap = new Map(cameras.map(c => [c.id, c.name]))
      const cables = rawCables.map(cable => ({
        ...cable,
        camera_name: cameraMap.get(cable.camera_id) || 'Câmera desconhecida',
      }))

      // Gerar PDF Técnico
      await generateReport({
        dvrs,
        cameras,
        switches,
        baluns,
        routers,
        credentials,
        cables,
        userEmail: user?.email || 'N/A',
        clientName: clientName.trim(),
        projectName: projectName.trim(),
      })

      toast('Relatório PDF gerado com sucesso!')
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err)
      toast('Erro ao gerar relatório: ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      
      <div>
        <h2 className="text-xl font-bold text-text-primary">Relatórios Técnicos</h2>
        <p className="text-text-muted text-sm mt-1">Gere entregas técnicas e laudos profissionais em PDF</p>
      </div>

      {/* Form Card */}
      <div className="bg-bg-secondary border border-border-light rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Entrega Técnica Consolidada (PDF Premium)</h3>
            <p className="text-xs text-text-muted">Documento completo com inventário de rede, credenciais, cabos, QR Codes e fotos</p>
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
            <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wide">O relatório incluirá:</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Câmeras" value={stats.cameras} subtitle={`${stats.camerasIP} IP`} icon={FileText} color="text-cyan-400" />
              <StatCard label="DVRs" value={stats.dvrs} icon={FileText} color="text-indigo-400" />
              <StatCard label="Switches" value={stats.switches} subtitle={`${stats.switchesPoe} PoE`} icon={FileText} color="text-emerald-400" />
              <StatCard label="Roteadores" value={stats.routers} icon={FileText} color="text-amber-400" />
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
                Carregando Imagens e Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gerar Entrega Técnica (PDF)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-bg-secondary/50 border border-border-light rounded-xl p-5 font-sans">
        <h4 className="text-sm font-semibold text-text-primary mb-2">O que está incluso na Entrega Técnica Premium:</h4>
        <ul className="space-y-1.5 text-sm text-text-muted">
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">1.</span> Capa profissional com dados consolidados do cliente e projeto</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">2.</span> Gráficos e indicadores horizontais de integridade e status de rede</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">3.</span> Inventário técnico detalhado de Roteadores, Switches, DVRs e Power Baluns</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">4.</span> Tabela de credenciais e IP de acesso aos equipamentos</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">5.</span> Fichas técnicas individuais de câmeras contendo o **QR Code** e a **Foto de Instalação do Local** lado a lado</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">6.</span> Detalhamento do par de vias de cabo UTP crimpados para cada câmera</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">7.</span> Log de entrega técnica com áreas de assinatura formalizada do técnico e cliente</li>
        </ul>
      </div>
    </div>
  )
}
