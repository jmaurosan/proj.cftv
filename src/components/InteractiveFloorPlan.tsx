import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Video,
  Server,
  Network,
  Wifi,
  Map as MapIcon,
  Upload,
  Save,
  Edit2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  HelpCircle,
  Plus,
  RefreshCw,
  Info,
  Tv
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import { uploadInstallationPhoto } from '../services/storageService'
import { useToast } from './ui/Toast'
import Button from './ui/Button'
import LoadingSpinner from './ui/LoadingSpinner'

interface Position {
  x: number
  y: number
  type: 'camera' | 'dvr' | 'switch' | 'router'
}

interface FloorPlanConfig {
  background: 'grid' | 'image' | 'satellite'
  bgUrl?: string
  zoom: number
  positions: Record<string, Position>
}

interface EquipmentItem {
  id: string
  name: string
  type: 'camera' | 'dvr' | 'switch' | 'router'
  ip_address: string | null
  status: string
  location: string
  brand?: string | null
  model?: string | null
  details?: string
  dvr_id?: string | null
  channel_number?: number | null
}

export default function InteractiveFloorPlan() {
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()

  const mapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Dados do cliente e do plano
  const [textNotes, setTextNotes] = useState('')
  const [bgUrl, setBgUrl] = useState('')
  const [backgroundType, setBackgroundType] = useState<'grid' | 'image' | 'satellite'>('grid')
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [satelliteUrl, setSatelliteUrl] = useState('')

  // Lista consolidada de equipamentos cadastrados para o cliente
  const [equipments, setEquipments] = useState<EquipmentItem[]>([])
  
  // Equipamento com popover de preview aberto
  const [activePreview, setActivePreview] = useState<string | null>(null)
  // Tempo para atualizar o relógio do CCTV
  const [cctvTime, setCctvTime] = useState('')

  // Efeito para relógio CCTV realista
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCctvTime(now.toLocaleString('pt-BR'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Carregar dados de nota do cliente e equipamentos
  const loadData = async () => {
    if (!selectedClientId) return
    setLoading(true)
    try {
      // 1. Carregar notas do Cliente
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('notes')
        .eq('id', selectedClientId)
        .single()

      if (clientErr) throw clientErr

      let loadedConfig: FloorPlanConfig = {
        background: 'grid',
        zoom: 1,
        positions: {}
      }

      if (client?.notes) {
        try {
          const parsed = JSON.parse(client.notes)
          if (parsed && (parsed.floorPlan || parsed.textNotes !== undefined)) {
            setTextNotes(parsed.textNotes || '')
            if (parsed.floorPlan) {
              loadedConfig = parsed.floorPlan
            }
          } else {
            setTextNotes(client.notes)
          }
        } catch {
          setTextNotes(client.notes)
        }
      }

      setBackgroundType(loadedConfig.background || 'grid')
      setBgUrl(loadedConfig.bgUrl || '')
      setZoom(loadedConfig.zoom || 1)
      setPositions(loadedConfig.positions || {})
      if (loadedConfig.background === 'satellite' && loadedConfig.bgUrl) {
        setSatelliteUrl(loadedConfig.bgUrl)
      }

      // 2. Carregar todos os equipamentos do Cliente
      const [camerasRes, dvrsRes, switchesRes, routersRes] = await Promise.all([
        supabase.from('cameras').select('id, name, status, ip_address, location, brand, model, installation_photo_url, dvr_id, channel_number').eq('client_id', selectedClientId),
        supabase.from('dvrs').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('switches').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('routers').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId)
      ])

      const list: EquipmentItem[] = []

      // Injetar câmeras
      if (camerasRes.data) {
        camerasRes.data.forEach((c) => {
          list.push({
            id: c.id,
            name: c.name,
            type: 'camera',
            ip_address: c.ip_address,
            status: c.status,
            location: c.location || 'Não informada',
            brand: c.brand,
            model: c.model,
            details: c.installation_photo_url || undefined,
            dvr_id: c.dvr_id,
            channel_number: c.channel_number
          })
        })
      }

      // Injetar DVRs
      if (dvrsRes.data) {
        dvrsRes.data.forEach((d) => {
          list.push({
            id: d.id,
            name: d.name,
            type: 'dvr',
            ip_address: d.ip_address,
            status: d.status,
            location: d.location || 'Não informada',
            brand: d.brand,
            model: d.model
          })
        })
      }

      // Injetar Switches
      if (switchesRes.data) {
        switchesRes.data.forEach((s) => {
          list.push({
            id: s.id,
            name: s.name,
            type: 'switch',
            ip_address: s.ip_address,
            status: s.status,
            location: s.location || 'Não informada',
            brand: s.brand,
            model: s.model
          })
        })
      }

      // Injetar Roteadores
      if (routersRes.data) {
        routersRes.data.forEach((r) => {
          list.push({
            id: r.id,
            name: r.name,
            type: 'router',
            ip_address: r.ip_address,
            status: r.status,
            location: r.location || 'Não informada',
            brand: r.brand,
            model: r.model
          })
        })
      }

      setEquipments(list)
    } catch (err: any) {
      console.error(err)
      toast('Erro ao carregar dados da planta baixa: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedClientId])

  // Salvar layout
  const handleSave = async (updatedPositions = positions, type = backgroundType, url = bgUrl) => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const config: FloorPlanConfig = {
        background: type,
        bgUrl: type === 'satellite' ? satelliteUrl : url,
        zoom,
        positions: updatedPositions
      }

      const notesPayload = JSON.stringify({
        textNotes,
        floorPlan: config
      })

      const { error } = await supabase
        .from('clients')
        .update({ notes: notesPayload })
        .eq('id', selectedClientId)

      if (error) throw error

      toast('Planta baixa salva com sucesso!')
      setIsEditing(false)
    } catch (err: any) {
      console.error(err)
      toast('Erro ao salvar planta baixa: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Lógica de drag-and-drop interno no Canvas
  const handleDragEnd = (id: string, info: any) => {
    if (!mapRef.current) return

    const rect = mapRef.current.getBoundingClientRect()
    // Calcula a porcentagem baseada nas coordenadas x e y do ponto final
    const x = ((info.point.x - rect.left) / rect.width) * 100
    const y = ((info.point.y - rect.top) / rect.height) * 100

    const constrainedX = Math.max(1, Math.min(99, x))
    const constrainedY = Math.max(1, Math.min(99, y))

    const newPositions = {
      ...positions,
      [id]: {
        ...positions[id],
        x: constrainedX,
        y: constrainedY
      }
    }
    setPositions(newPositions)
    // Autosalva a nova posição para maior conveniência
    handleSave(newPositions)
  }

  // Adiciona um equipamento ao canvas no centro
  const handleAddEquipment = (id: string, type: 'camera' | 'dvr' | 'switch' | 'router') => {
    const newPositions = {
      ...positions,
      [id]: {
        x: 50,
        y: 50,
        type
      }
    }
    setPositions(newPositions)
    handleSave(newPositions)
  }

  // Remove um equipamento do canvas (devolve para a lista)
  const handleRemoveEquipment = (id: string) => {
    const newPositions = { ...positions }
    delete newPositions[id]
    setPositions(newPositions)
    handleSave(newPositions)
  }

  // Upload da imagem customizada
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedClientId) return

    setUploading(true)
    try {
      // 1. Obter ID do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // 2. Upload para installation-photos
      const { url, error } = await uploadInstallationPhoto(file, user.id, `floorplan-${selectedClientId}`)
      if (error) throw new Error(error)

      if (url) {
        setBgUrl(url)
        setBackgroundType('image')
        await handleSave(positions, 'image', url)
        toast('Imagem carregada e configurada!')
      }
    } catch (err: any) {
      console.error(err)
      toast('Erro ao fazer upload da imagem: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  // Equipamentos posicionados e não posicionados
  const positionedIds = Object.keys(positions)
  const nonPositionedEquipments = equipments.filter((e) => !positionedIds.includes(e.id))
  const positionedEquipments = equipments.filter((e) => positionedIds.includes(e.id))
  const equipmentById = new Map(equipments.map((equip) => [equip.id, equip]))
  const cameraDvrConnections = positionedEquipments
    .filter((equip) => {
      if (equip.type !== 'camera' || !equip.dvr_id) return false
      const linkedDvr = equipmentById.get(equip.dvr_id)
      return linkedDvr?.type === 'dvr' && !!positions[equip.id] && !!positions[equip.dvr_id]
    })
    .map((camera) => {
      const dvr = equipmentById.get(camera.dvr_id!)!
      return {
        id: `${camera.dvr_id}-${camera.id}`,
        camera,
        dvr,
        source: positions[camera.dvr_id!],
        target: positions[camera.id],
        label: camera.channel_number ? `CH${camera.channel_number}` : 'DVR'
      }
    })

  // Obter cores por status
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'ativo':
      case 'online':
        return {
          bg: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
          pulse: 'bg-emerald-500',
          text: 'text-emerald-400'
        }
      case 'manutencao':
      case 'warning':
        return {
          bg: 'bg-amber-500/20 border-amber-500 text-amber-400',
          pulse: 'bg-amber-500',
          text: 'text-amber-400'
        }
      case 'inativo':
      case 'offline':
      default:
        return {
          bg: 'bg-rose-500/20 border-rose-500 text-rose-400',
          pulse: 'bg-rose-500',
          text: 'text-rose-400'
        }
    }
  }

  // Obter ícone por tipo de equipamento
  const getEquipmentIcon = (type: 'camera' | 'dvr' | 'switch' | 'router', className = 'w-4 h-4') => {
    switch (type) {
      case 'camera':
        return <Video className={className} />
      case 'dvr':
        return <Server className={className} />
      case 'switch':
        return <Network className={className} />
      case 'router':
        return <Wifi className={className} />
    }
  }

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case 'camera':
        return 'Câmera'
      case 'dvr':
        return 'DVR'
      case 'switch':
        return 'Switch'
      case 'router':
        return 'Roteador'
      default:
        return type
    }
  }

  if (!selectedClientId) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border-light p-8 text-center max-w-lg mx-auto mt-12">
        <MapIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">Nenhum cliente selecionado</h3>
        <p className="text-text-muted text-sm mb-4">
          Por favor, selecione um cliente no menu superior para visualizar ou configurar a planta baixa interativa.
        </p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-secondary p-5 rounded-xl border border-border-light">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-accent animate-pulse" />
            Planta Baixa Interativa
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Cliente: <span className="text-accent font-medium">{selectedClientName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Fundo */}
          <div className="flex bg-bg-primary rounded-lg p-1 border border-border-light">
            <button
              onClick={() => {
                setBackgroundType('grid')
                handleSave(positions, 'grid')
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                backgroundType === 'grid'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => {
                setBackgroundType('image')
                if (bgUrl) handleSave(positions, 'image')
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                backgroundType === 'image'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Imagem
            </button>
            <button
              onClick={() => {
                setBackgroundType('satellite')
                if (satelliteUrl) handleSave(positions, 'satellite', satelliteUrl)
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                backgroundType === 'satellite'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Satélite
            </button>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${
              isEditing
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-bg-primary hover:bg-bg-tertiary border-border-light text-text-primary'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? 'Pronto (Arraste Ativo)' : 'Mover Equipamentos'}
          </button>
        </div>
      </header>

      {/* Se o fundo for satélite e não houver url de satélite configurada */}
      {backgroundType === 'satellite' && !satelliteUrl && (
        <div className="bg-bg-secondary p-5 rounded-xl border border-border-light flex flex-col md:flex-row items-center gap-4">
          <Info className="w-8 h-8 text-accent shrink-0 animate-bounce" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-semibold text-text-primary">Configurar Imagem Aérea/Satélite</h4>
            <p className="text-xs text-text-muted">
              Insira a URL de uma imagem de satélite do Google Earth, Maps ou outra foto aérea da edificação para servir de fundo.
            </p>
            <input
              type="text"
              placeholder="https://exemplo.com/minha-imagem-satelite.jpg"
              className="w-full bg-bg-primary border border-border-light text-sm text-text-primary rounded-lg px-3 py-2 mt-2 outline-none focus:border-accent"
              value={satelliteUrl}
              onChange={(e) => setSatelliteUrl(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => handleSave(positions, 'satellite', satelliteUrl)}
          >
            Configurar
          </Button>
        </div>
      )}

      {/* Grid Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel Lateral: Equipamentos Disponíveis */}
        <div className="lg:col-span-1 bg-bg-secondary rounded-xl border border-border-light p-4 space-y-4 h-[650px] flex flex-col">
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Configurações de Fundo</h3>
            <p className="text-text-muted text-xs mt-1">Carregue ou modifique a imagem da planta baixa.</p>
          </div>

          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-text-muted border-t-text-primary rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Enviando...' : 'Upload de Planta'}
            </Button>
          </div>

          <hr className="border-border-light" />

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                Não Posicionados ({nonPositionedEquipments.length})
              </h3>
              <p className="text-[10px] text-text-muted">Adicione estes itens ao mapa técnico.</p>
            </div>

            {nonPositionedEquipments.length === 0 ? (
              <div className="text-center py-8 px-2 border border-dashed border-border-light rounded-lg">
                <p className="text-xs text-text-muted">Todos os equipamentos já estão posicionados no mapa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {nonPositionedEquipments.map((equip) => {
                  const style = getStatusColorClass(equip.status)
                  return (
                    <div
                      key={equip.id}
                      className="flex items-center justify-between p-2.5 bg-bg-primary rounded-lg border border-border-light hover:border-accent/40 group transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`p-1.5 rounded-lg border ${style.bg}`}>
                          {getEquipmentIcon(equip.type, 'w-3.5 h-3.5')}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-text-primary truncate">{equip.name}</p>
                          <p className="text-[9px] font-mono text-text-muted truncate">
                            {equip.ip_address || 'Sem IP'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddEquipment(equip.id, equip.type)}
                        className="p-1 rounded bg-accent/10 text-accent hover:bg-accent hover:text-on-accent transition-all opacity-80 group-hover:opacity-100"
                        title="Adicionar ao mapa"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {positionedEquipments.length > 0 && (
              <>
                <hr className="border-border-light" />
                <div>
                  <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">
                    No Mapa ({positionedEquipments.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {positionedEquipments.map((equip) => {
                    const style = getStatusColorClass(equip.status)
                    return (
                      <div
                        key={equip.id}
                        className="flex items-center justify-between p-2 bg-bg-primary/50 rounded-lg border border-border-light/60"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`p-1 rounded-md border ${style.bg}`}>
                            {getEquipmentIcon(equip.type, 'w-3 h-3')}
                          </div>
                          <p className="text-xs text-text-secondary truncate">{equip.name}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveEquipment(equip.id)}
                          className="p-1 text-text-muted hover:text-rose-400 transition-colors"
                          title="Remover do mapa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas da Planta Baixa */}
        <div className="lg:col-span-3 bg-bg-secondary rounded-xl border border-border-light relative overflow-hidden h-[650px] flex items-center justify-center">
          {/* Controles de Zoom */}
          <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 bg-bg-primary/80 backdrop-blur-md p-1.5 rounded-lg border border-border-light">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.15, 3.5))}
              className="p-2 text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="text-[10px] text-center font-mono font-bold text-text-muted border-y border-border-light py-1">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
              className="p-2 text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title="Redefinir Zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Legenda Flutuante */}
          <div className="absolute bottom-4 left-4 z-30 bg-bg-primary/80 backdrop-blur-md px-3 py-2 rounded-lg border border-border-light flex gap-3 text-[10px] uppercase font-bold text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/25 border border-emerald-500"></span> Ativo
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/25 border border-rose-500"></span> Offline
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/25 border border-amber-500"></span> Manutenção
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
            <div
              ref={mapRef}
              className={`relative transition-transform duration-200 ease-out origin-center shrink-0 border border-border-light shadow-2xl rounded-sm ${
                backgroundType === 'grid' ? 'floorplan-grid' : ''
              }`}
              style={{
                width: '1000px',
                height: '550px',
                transform: `scale(${zoom})`,
                backgroundImage:
                  backgroundType === 'image' && bgUrl
                    ? `url("${bgUrl}")`
                    : backgroundType === 'satellite' && satelliteUrl
                    ? `url("${satelliteUrl}")`
                    : undefined,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: backgroundType === 'grid' ? '#0b111e' : '#181e2b'
              }}
            >
              {/* Se o fundo for Grid, exibimos um grid técnico */}
              {backgroundType === 'grid' && (
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                  }}
                />
              )}

              {/* Conexões físicas entre DVRs e câmeras posicionadas */}
              {cameraDvrConnections.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="floor-link-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#0ea5e9" floodOpacity="0.45" />
                    </filter>
                  </defs>

                  {cameraDvrConnections.map((conn) => {
                    const isActive =
                      (conn.camera.status === 'ativo' || conn.camera.status === 'online') &&
                      (conn.dvr.status === 'ativo' || conn.dvr.status === 'online')
                    const midX = (conn.source.x + conn.target.x) / 2
                    const midY = (conn.source.y + conn.target.y) / 2
                    const bend = conn.target.y >= conn.source.y ? -7 : 7
                    const controlX = midX
                    const controlY = midY + bend
                    const pathData = `M ${conn.source.x} ${conn.source.y} Q ${controlX} ${controlY} ${conn.target.x} ${conn.target.y}`

                    return (
                      <g key={conn.id} filter={isActive ? 'url(#floor-link-glow)' : undefined}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isActive ? '#0ea5e9' : '#64748b'}
                          strokeWidth={isActive ? 2.2 : 1.6}
                          strokeDasharray="7 5"
                          strokeLinecap="round"
                          opacity={isActive ? 0.85 : 0.55}
                          vectorEffect="non-scaling-stroke"
                        />
                        <circle
                          cx={conn.source.x}
                          cy={conn.source.y}
                          r="0.8"
                          fill={isActive ? '#22d3ee' : '#94a3b8'}
                          opacity="0.85"
                        />
                        <circle
                          cx={conn.target.x}
                          cy={conn.target.y}
                          r="0.8"
                          fill={isActive ? '#22d3ee' : '#94a3b8'}
                          opacity="0.85"
                        />
                        <text
                          x={midX}
                          y={midY - 1.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-slate-100 font-mono font-bold"
                          fontSize="2.5"
                          stroke="#0f172a"
                          strokeWidth="0.7"
                          paintOrder="stroke"
                          vectorEffect="non-scaling-stroke"
                        >
                          {conn.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {/* Renderização dos Pinos dos Equipamentos no Canvas */}
              {positionedEquipments.map((equip) => {
                const pos = positions[equip.id]
                if (!pos) return null

                const statusStyle = getStatusColorClass(equip.status)
                const isOnline = equip.status === 'ativo' || equip.status === 'online'
                const isPreviewing = activePreview === equip.id

                return (
                  <motion.div
                    key={equip.id}
                    drag={isEditing}
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(e, info) => handleDragEnd(equip.id, info)}
                    className="absolute z-20 cursor-pointer select-none"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      x: '-50%',
                      y: '-50%'
                    }}
                    whileHover={{ scale: isEditing ? 1.05 : 1.15 }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isEditing) {
                          setActivePreview(isPreviewing ? null : equip.id)
                        }
                      }}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${statusStyle.bg} ${
                        isPreviewing ? 'ring-2 ring-accent scale-110' : ''
                      }`}
                    >
                      {getEquipmentIcon(equip.type, 'w-4.5 h-4.5')}

                      {/* Sinalização de pulso ativo */}
                      {isOnline && (
                        <span
                          className={`absolute inset-0 rounded-full animate-ping opacity-25 -z-10 ${statusStyle.pulse}`}
                        />
                      )}

                      {/* Pequena tag indicativa do tipo */}
                      <span className="absolute -top-1 -right-1 bg-bg-secondary text-text-primary text-[7px] px-1 rounded border border-border-light scale-90 uppercase font-mono">
                        {equip.type === 'camera' ? 'cam' : equip.type}
                      </span>
                    </div>

                    {/* Popover / Preview Integrado */}
                    {isPreviewing && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-bg-secondary border border-border-light rounded-xl shadow-2xl z-50 p-0 overflow-hidden w-72 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Se for Câmera, simula o preview CCTV real */}
                        {equip.type === 'camera' ? (
                          <div className="relative aspect-video bg-black overflow-hidden group">
                            {equip.details ? (
                              <img
                                src={equip.details}
                                alt={equip.name}
                                className="w-full h-full object-cover opacity-80"
                              />
                            ) : (
                              // Placeholder de streaming CCTV premium
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted bg-neutral-900 border border-neutral-800">
                                <Tv className="w-8 h-8 text-neutral-600 mb-2 animate-pulse" />
                                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                                  SEM SINAL DE VÍDEO
                                </span>
                              </div>
                            )}

                            {/* Scanlines CCTV Retrô / Filtro digital */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent pointer-events-none opacity-20" />
                            <div
                              className="absolute inset-0 pointer-events-none opacity-10"
                              style={{
                                backgroundImage:
                                  'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.8) 120%)'
                              }}
                            />

                            {/* Overlays de Câmera */}
                            <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              LIVE
                            </div>

                            <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-text-primary">
                              {cctvTime}
                            </div>

                            <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-text-secondary">
                              {equip.name} - CANAL
                            </div>
                          </div>
                        ) : (
                          // Header normal para outros dispositivos
                          <div className="bg-bg-primary p-3 border-b border-border-light flex items-center justify-between">
                            <span className="text-xs font-bold text-accent uppercase tracking-wider">
                              {getEquipmentTypeLabel(equip.type)}
                            </span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {equip.status}
                            </span>
                          </div>
                        )}

                        {/* Corpo com Informações */}
                        <div className="p-3.5 space-y-2.5 text-xs text-text-secondary">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-text-primary text-sm">{equip.name}</h4>
                              <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-accent" />
                                {equip.location}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-light text-[10px] font-mono">
                            <div>
                              <span className="text-text-muted block">Endereço IP</span>
                              <span className="text-text-primary font-bold">
                                {equip.ip_address || 'Não configurado'}
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted block">Marca / Modelo</span>
                              <span className="text-text-primary font-bold truncate block">
                                {equip.brand || '-'} {equip.model || ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRemoveEquipment(equip.id)}
                            >
                              Remover do Mapa
                            </Button>
                            <Button size="sm" onClick={() => setActivePreview(null)}>
                              Fechar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de estilos da planta baixa injetados via inline style */}
      <style>{`
        .floorplan-grid {
          background-size: 30px 30px;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
        }
      `}</style>
    </div>
  )
}
