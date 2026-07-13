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
  Tv,
  ExternalLink,
  Square,
  Minus,
  MousePointer2,
  Palette,
  Undo2,
  Redo2,
  Layers,
  Download,
  FileImage,
  Eye,
  Cable,
  PackageOpen,
  BatteryCharging,
  HardDrive,
  Zap,
  Copy
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { CABLE_TYPE_LABELS } from '../lib/constants'
import {
  createManualConnection,
  validateManualConnection,
  type ManualConnection,
} from '../lib/floorPlanConnections'
import { getNextEquipmentPosition } from '../lib/floorPlanLayout'
import {
  createTechnicalSymbol,
  duplicateTechnicalSymbols,
  TECHNICAL_SYMBOL_CATALOG,
  type TechnicalSymbol,
  type TechnicalSymbolKind,
} from '../lib/floorPlanSymbols'
import { estimateConnectionLength, summarizeCapacity } from '../lib/materialEstimate'
import { analyzeCoverage } from '../lib/coverageAnalysis'
import { useClient } from '../contexts/ClientContext'
import { getInstallationPhotoUrl, uploadInstallationPhoto } from '../services/storageService'
import { useToast } from './ui/Toast'
import Button from './ui/Button'
import LoadingSpinner from './ui/LoadingSpinner'

interface Position {
  x: number
  y: number
  type: 'camera' | 'dvr' | 'switch' | 'router' | 'balun'
}

interface DrawingShape {
  id: string
  type: 'line' | 'rect'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
}

interface CameraViewConfig {
  angle: number
  range: number
  direction: number
  color: string
}

interface FloorPlanLayers {
  background: boolean
  drawings: boolean
  cables: boolean
  fieldsOfView: boolean
  blindSpots: boolean
  equipment: boolean
}

interface CableConnectionItem {
  camera_id: string
  cable_type: string
  cable_length_meters: number | null
  wiring_standard: string | null
  has_splice: boolean
}

interface FloorPlanConfig {
  background: 'grid' | 'image' | 'satellite'
  bgUrl?: string
  satelliteQuery?: string
  zoom: number
  panX?: number
  panY?: number
  positions: Record<string, Position>
  drawings?: DrawingShape[]
  cameraViews?: Record<string, CameraViewConfig>
  manualConnections?: ManualConnection[]
  technicalSymbols?: TechnicalSymbol[]
  planWidthMeters?: number
  planHeightMeters?: number
  layers?: FloorPlanLayers
  snapToGrid?: boolean
}

interface EquipmentItem {
  id: string
  name: string
  type: 'camera' | 'dvr' | 'switch' | 'router' | 'balun'
  ip_address: string | null
  status: string
  location: string
  brand?: string | null
  model?: string | null
  details?: string
  dvr_id?: string | null
  channel_number?: number | null
  switch_id?: string | null
  switch_port?: number | null
  camera_type?: string | null
  connection_type?: string | null
  power_source_type?: string | null
  poe_powered?: boolean
  total_ports?: number
  total_channels?: number
  power_supply_brand?: string | null
  power_supply_model?: string | null
}

interface EditorSnapshot {
  positions: Record<string, Position>
  drawings: DrawingShape[]
  cameraViews: Record<string, CameraViewConfig>
  manualConnections: ManualConnection[]
  technicalSymbols: TechnicalSymbol[]
}

const DEFAULT_LAYERS: FloorPlanLayers = {
  background: true,
  drawings: true,
  cables: true,
  fieldsOfView: true,
  blindSpots: false,
  equipment: true,
}

const getCableColor = (cableType: string) => {
  if (cableType.includes('fibra') || cableType.includes('fiber')) return '#a855f7'
  if (cableType.includes('coaxial') || cableType.includes('rg')) return '#f59e0b'
  if (cableType.includes('power') || cableType.includes('alimentacao')) return '#ef4444'
  if (cableType.startsWith('utp_')) return '#0ea5e9'
  return '#22c55e'
}

export default function InteractiveFloorPlan() {
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()

  const mapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<EditorSnapshot[]>([])
  const futureRef = useRef<EditorSnapshot[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Dados do cliente e do plano
  const [textNotes, setTextNotes] = useState('')
  const [notesData, setNotesData] = useState<Record<string, any>>({})
  const [bgUrl, setBgUrl] = useState('')
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null)
  const [backgroundType, setBackgroundType] = useState<'grid' | 'image' | 'satellite'>('grid')
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [satelliteUrl, setSatelliteUrl] = useState('')
  const [satellitePreviewUrl, setSatellitePreviewUrl] = useState<string | null>(null)
  const [satelliteQuery, setSatelliteQuery] = useState('')
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [planWidthMeters, setPlanWidthMeters] = useState(40)
  const [planHeightMeters, setPlanHeightMeters] = useState(22)
  const [drawings, setDrawings] = useState<DrawingShape[]>([])
  const [drawMode, setDrawMode] = useState<'select' | 'line' | 'rect' | 'cable'>('select')
  const [drawColor, setDrawColor] = useState('#22d3ee')
  const [drawWidth, setDrawWidth] = useState(2)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [draftDrawing, setDraftDrawing] = useState<DrawingShape | null>(null)
  const [cameraViews, setCameraViews] = useState<Record<string, CameraViewConfig>>({})
  const [manualConnections, setManualConnections] = useState<ManualConnection[]>([])
  const [technicalSymbols, setTechnicalSymbols] = useState<TechnicalSymbol[]>([])
  const [selectedTechnicalSymbolIds, setSelectedTechnicalSymbolIds] = useState<string[]>([])
  const [selectedManualConnectionId, setSelectedManualConnectionId] = useState<string | null>(null)
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null)
  const [layers, setLayers] = useState<FloorPlanLayers>(DEFAULT_LAYERS)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [cables, setCables] = useState<CableConnectionItem[]>([])

  // Lista consolidada de equipamentos cadastrados para o cliente
  const [equipments, setEquipments] = useState<EquipmentItem[]>([])
  
  // Equipamento com popover de preview aberto
  const [activePreview, setActivePreview] = useState<string | null>(null)
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([])
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
            setNotesData(parsed)
            setTextNotes(parsed.textNotes || '')
            if (parsed.floorPlan) {
              loadedConfig = parsed.floorPlan
            }
          } else {
            setNotesData({})
            setTextNotes(client.notes)
          }
        } catch {
          setNotesData({})
          setTextNotes(client.notes)
        }
      }

      setBackgroundType(loadedConfig.background || 'grid')
      setBgUrl(loadedConfig.bgUrl || '')
      setZoom(loadedConfig.zoom || 1)
      setPanX(loadedConfig.panX || 0)
      setPanY(loadedConfig.panY || 0)
      setPlanWidthMeters(loadedConfig.planWidthMeters || 40)
      setPlanHeightMeters(loadedConfig.planHeightMeters || 22)
      setPositions(loadedConfig.positions || {})
      setDrawings(loadedConfig.drawings || [])
      setCameraViews(loadedConfig.cameraViews || {})
      setManualConnections(loadedConfig.manualConnections || [])
      setTechnicalSymbols(loadedConfig.technicalSymbols || [])
      setSelectedTechnicalSymbolIds([])
      setSelectedManualConnectionId(null)
      setPendingConnectionSourceId(null)
      setLayers({ ...DEFAULT_LAYERS, ...(loadedConfig.layers || {}) })
      setSnapToGrid(loadedConfig.snapToGrid ?? true)
      historyRef.current = []
      futureRef.current = []
      if (loadedConfig.background === 'satellite' && loadedConfig.bgUrl) {
        setSatelliteUrl(loadedConfig.bgUrl)
      }
      setSatelliteQuery(loadedConfig.satelliteQuery || '')

      // 2. Carregar todos os equipamentos do Cliente
      const [camerasRes, dvrsRes, switchesRes, routersRes, balunsRes] = await Promise.all([
        supabase.from('cameras').select('*').eq('client_id', selectedClientId),
        supabase.from('dvrs').select('id, name, status, ip_address, location, brand, model, total_channels').eq('client_id', selectedClientId),
        supabase.from('switches').select('id, name, status, ip_address, location, brand, model, total_ports').eq('client_id', selectedClientId),
        supabase.from('routers').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('power_baluns').select('id, name, status, location').eq('client_id', selectedClientId)
      ])

      const cameraIds = (camerasRes.data || []).map((camera) => camera.id)
      const cablesRes = cameraIds.length > 0
        ? await supabase
            .from('cable_connections')
            .select('camera_id, cable_type, cable_length_meters, wiring_standard, has_splice')
            .in('camera_id', cameraIds)
        : { data: [] }
      setCables((cablesRes.data || []) as CableConnectionItem[])

      const cameraPhotoUrls = await Promise.all(
        (camerasRes.data || []).map(async (camera) => [
          camera.id,
          camera.installation_photo_url ? await getInstallationPhotoUrl(camera.installation_photo_url) : null,
        ] as const)
      )
      const cameraPhotoUrlById = new Map(cameraPhotoUrls)
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
            details: cameraPhotoUrlById.get(c.id) || undefined,
            dvr_id: c.dvr_id,
            channel_number: c.channel_number,
            switch_id: c.switch_id,
            switch_port: c.switch_port,
            camera_type: c.type,
            connection_type: c.connection_type,
            power_source_type: c.power_source_type,
            poe_powered: c.poe_powered,
            power_supply_brand: c.power_supply_brand,
            power_supply_model: c.power_supply_model
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
            model: d.model,
            total_channels: d.total_channels
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
            model: s.model,
            total_ports: s.total_ports
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

      if (balunsRes.data) {
        balunsRes.data.forEach((balun) => {
          list.push({
            id: balun.id,
            name: balun.name,
            type: 'balun',
            ip_address: null,
            status: balun.status,
            location: balun.location || 'Não informada'
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

  useEffect(() => {
    let cancelled = false
    async function loadBackgroundPreview() {
      if (!bgUrl) {
        setBgPreviewUrl(null)
        return
      }
      const signedUrl = await getInstallationPhotoUrl(bgUrl)
      if (!cancelled) setBgPreviewUrl(signedUrl || bgUrl)
    }
    loadBackgroundPreview()
    return () => {
      cancelled = true
    }
  }, [bgUrl])

  useEffect(() => {
    let cancelled = false
    async function loadSatellitePreview() {
      if (!satelliteUrl) {
        setSatellitePreviewUrl(null)
        return
      }
      const signedUrl = await getInstallationPhotoUrl(satelliteUrl)
      if (!cancelled) setSatellitePreviewUrl(signedUrl || satelliteUrl)
    }
    loadSatellitePreview()
    return () => {
      cancelled = true
    }
  }, [satelliteUrl])

  // Salvar layout
  const handleSave = async (updatedPositions = positions, type = backgroundType, url = bgUrl) => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const finalBgUrl = type === 'satellite' ? (url || satelliteUrl) : url
      const config: FloorPlanConfig = {
        background: type,
        bgUrl: finalBgUrl,
        satelliteQuery,
        zoom,
        panX,
        panY,
        planWidthMeters,
        planHeightMeters,
        positions: updatedPositions,
        drawings,
        cameraViews,
        manualConnections,
        technicalSymbols,
        layers,
        snapToGrid
      }

      const notesPayload = JSON.stringify({
        ...notesData,
        textNotes,
        floorPlan: config
      })

      const { error } = await supabase
        .from('clients')
        .update({ notes: notesPayload })
        .eq('id', selectedClientId)

      if (error) throw error

      toast('Planta baixa salva com sucesso!')
      setNotesData((prev) => ({ ...prev, textNotes, floorPlan: config }))
    } catch (err: any) {
      console.error(err)
      toast('Erro ao salvar planta baixa: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openSatelliteMap = () => {
    const query = satelliteQuery.trim() || selectedClientName || ''
    const url = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : 'https://www.google.com/maps'
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getSnapshot = (): EditorSnapshot => ({
    positions: structuredClone(positions),
    drawings: structuredClone(drawings),
    cameraViews: structuredClone(cameraViews),
    manualConnections: structuredClone(manualConnections),
    technicalSymbols: structuredClone(technicalSymbols),
  })

  const pushHistory = () => {
    historyRef.current = [...historyRef.current.slice(-29), getSnapshot()]
    futureRef.current = []
  }

  const applySnapshot = (snapshot: EditorSnapshot) => {
    setPositions(snapshot.positions)
    setDrawings(snapshot.drawings)
    setCameraViews(snapshot.cameraViews)
    setManualConnections(snapshot.manualConnections)
    setTechnicalSymbols(snapshot.technicalSymbols)
    setSelectedDrawingId(null)
    setSelectedManualConnectionId(null)
    setSelectedTechnicalSymbolIds([])
  }

  const handleUndo = () => {
    const previous = historyRef.current.at(-1)
    if (!previous) return
    futureRef.current = [getSnapshot(), ...futureRef.current.slice(0, 29)]
    historyRef.current = historyRef.current.slice(0, -1)
    applySnapshot(previous)
  }

  const handleRedo = () => {
    const next = futureRef.current[0]
    if (!next) return
    historyRef.current = [...historyRef.current, getSnapshot()]
    futureRef.current = futureRef.current.slice(1)
    applySnapshot(next)
  }

  const snapPercent = (value: number) => snapToGrid ? Math.round(value / 2.5) * 2.5 : value

  const getCanvasPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return null
    const rect = mapRef.current.getBoundingClientRect()
    return {
      x: snapPercent(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))),
      y: snapPercent(Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)))
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (drawMode === 'cable') {
      if (event.target === event.currentTarget) setPendingConnectionSourceId(null)
      return
    }
    if (drawMode === 'select') {
      if (event.target === event.currentTarget) {
        setSelectedEquipmentIds([])
        setSelectedTechnicalSymbolIds([])
        setActivePreview(null)
      }
      return
    }
    const point = getCanvasPoint(event)
    if (!point) return
    event.preventDefault()
    setActivePreview(null)
    setSelectedDrawingId(null)
    setDraftDrawing({
      id: `draft-${Date.now()}`,
      type: drawMode,
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      color: drawColor,
      width: drawWidth
    })
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draftDrawing) return
    const point = getCanvasPoint(event)
    if (!point) return
    setDraftDrawing((current) => current ? { ...current, x2: point.x, y2: point.y } : null)
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draftDrawing) return
    const point = getCanvasPoint(event)
    if (!point) return
    const nextDrawing = {
      ...draftDrawing,
      id: `drawing-${Date.now()}`,
      x2: point.x,
      y2: point.y
    }
    const distance = Math.hypot(nextDrawing.x2 - nextDrawing.x1, nextDrawing.y2 - nextDrawing.y1)
    if (distance > 0.5) {
      pushHistory()
      setDrawings((prev) => [...prev, nextDrawing])
      toast('Desenho adicionado. Clique em Salvar Planta para gravar.')
    }
    setDraftDrawing(null)
  }

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawingId) return
    pushHistory()
    setDrawings((prev) => prev.filter((drawing) => drawing.id !== selectedDrawingId))
    setSelectedDrawingId(null)
  }

  const isAutomaticConnection = (sourceId: string, targetId: string) => (
    equipments.some((equipment) => (
      equipment.type === 'camera' &&
      ((equipment.id === sourceId && (equipment.switch_id || equipment.dvr_id) === targetId) ||
        (equipment.id === targetId && (equipment.switch_id || equipment.dvr_id) === sourceId))
    ))
  )

  const handleEquipmentConnectionClick = (equipmentId: string) => {
    const isTechnicalSymbol = technicalSymbols.some((symbol) => symbol.id === equipmentId)
    if (isTechnicalSymbol) {
      setSelectedTechnicalSymbolIds([equipmentId])
      setSelectedEquipmentIds([])
    } else {
      setSelectedEquipmentIds([equipmentId])
      setSelectedTechnicalSymbolIds([])
    }
    setActivePreview(null)
    setSelectedManualConnectionId(null)

    if (!pendingConnectionSourceId) {
      setPendingConnectionSourceId(equipmentId)
      toast('Origem selecionada. Agora clique no equipamento de destino.')
      return
    }

    const validationError = validateManualConnection(
      manualConnections,
      pendingConnectionSourceId,
      equipmentId,
    )
    if (validationError) {
      toast(validationError, 'error')
      return
    }
    if (isAutomaticConnection(pendingConnectionSourceId, equipmentId)) {
      toast('Esta conexão já é gerada pelo cadastro físico da câmera.', 'error')
      return
    }

    const source = equipments.find((equipment) => equipment.id === pendingConnectionSourceId)
      || technicalSymbols.find((symbol) => symbol.id === pendingConnectionSourceId)
    const target = equipments.find((equipment) => equipment.id === equipmentId)
      || technicalSymbols.find((symbol) => symbol.id === equipmentId)
    if (!source || !target) return
    const sourceType = 'type' in source ? source.type : source.kind
    const targetType = 'type' in target ? target.type : target.kind
    const sourceName = 'name' in source ? source.name : source.label
    const targetName = 'name' in target ? target.name : target.label
    const isPowerConnection = ['power_supply', 'ups'].includes(sourceType) || ['power_supply', 'ups'].includes(targetType)
    const cableType = isPowerConnection
      ? 'power_12v'
      : sourceType === 'camera' || targetType === 'camera' ? 'utp_cat5' : 'utp_cat6'
    const connection = createManualConnection({
      id: crypto.randomUUID(),
      sourceId: source.id,
      targetId: target.id,
      cableType,
      label: sourceName + ' - ' + targetName,
      lineStyle: 'dashed',
      color: getCableColor(cableType),
    })
    pushHistory()
    setManualConnections((prev) => [...prev, connection])
    setSelectedManualConnectionId(connection.id)
    setPendingConnectionSourceId(null)
    toast('Conexão adicionada. Clique em Salvar Planta para gravar.')
  }

  const updateManualConnection = (id: string, updates: Partial<ManualConnection>) => {
    setManualConnections((prev) => prev.map((connection) => (
      connection.id === id ? { ...connection, ...updates } : connection
    )))
  }

  const handleDeleteSelectedConnection = () => {
    if (!selectedManualConnectionId) return
    pushHistory()
    setManualConnections((prev) => prev.filter((connection) => connection.id !== selectedManualConnectionId))
    setSelectedManualConnectionId(null)
    toast('Conexão removida. Salve a planta para confirmar.')
  }

  // Lógica de drag-and-drop interno no Canvas
  const handleDragEnd = (id: string, info: any) => {
    if (!mapRef.current) return

    const rect = mapRef.current.getBoundingClientRect()
    // Calcula a porcentagem baseada nas coordenadas x e y do ponto final
    const x = ((info.point.x - rect.left) / rect.width) * 100
    const y = ((info.point.y - rect.top) / rect.height) * 100

    const constrainedX = snapPercent(Math.max(1, Math.min(99, x)))
    const constrainedY = snapPercent(Math.max(1, Math.min(99, y)))

    pushHistory()
    const original = positions[id]
    if (!original) return
    const deltaX = constrainedX - original.x
    const deltaY = constrainedY - original.y
    const movingIds = selectedEquipmentIds.includes(id) && selectedEquipmentIds.length > 1
      ? selectedEquipmentIds
      : [id]
    const newPositions = { ...positions }
    movingIds.forEach((movingId) => {
      const current = positions[movingId]
      if (!current) return
      newPositions[movingId] = {
        ...current,
        x: snapPercent(Math.max(1, Math.min(99, current.x + deltaX))),
        y: snapPercent(Math.max(1, Math.min(99, current.y + deltaY)))
      }
    })
    setPositions(newPositions)
  }

  // Adiciona um equipamento ao canvas no centro
  const handleAddEquipment = (id: string, type: Position['type']) => {
    pushHistory()
    const nextPosition = getNextEquipmentPosition(Object.keys(positions).length)
    const newPositions = {
      ...positions,
      [id]: {
        ...nextPosition,
        type
      }
    }
    setPositions(newPositions)
  }

  // Remove um equipamento do canvas (devolve para a lista)
  const handleRemoveEquipment = (id: string) => {
    pushHistory()
    const newPositions = { ...positions }
    delete newPositions[id]
    setPositions(newPositions)
  }

  const handleAddTechnicalSymbol = (kind: TechnicalSymbolKind) => {
    pushHistory()
    const position = getNextEquipmentPosition(Object.keys(positions).length + technicalSymbols.length)
    const symbol = createTechnicalSymbol(kind, position)
    setTechnicalSymbols((prev) => [...prev, symbol])
    setSelectedTechnicalSymbolIds([symbol.id])
    setSelectedEquipmentIds([])
    setSelectedDrawingId(null)
    setSelectedManualConnectionId(null)
    setDrawMode('select')
  }

  const handleTechnicalSymbolDragEnd = (id: string, info: any) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x = snapPercent(Math.max(1, Math.min(99, ((info.point.x - rect.left) / rect.width) * 100)))
    const y = snapPercent(Math.max(1, Math.min(99, ((info.point.y - rect.top) / rect.height) * 100)))
    const original = technicalSymbols.find((symbol) => symbol.id === id)
    if (!original) return
    pushHistory()
    const deltaX = x - original.x
    const deltaY = y - original.y
    const movingIds = selectedTechnicalSymbolIds.includes(id) && selectedTechnicalSymbolIds.length > 1
      ? selectedTechnicalSymbolIds
      : [id]
    setTechnicalSymbols((prev) => prev.map((symbol) => movingIds.includes(symbol.id)
      ? {
          ...symbol,
          x: snapPercent(Math.max(1, Math.min(99, symbol.x + deltaX))),
          y: snapPercent(Math.max(1, Math.min(99, symbol.y + deltaY))),
        }
      : symbol))
  }

  const handleRemoveTechnicalSymbol = (id: string) => {
    pushHistory()
    setTechnicalSymbols((prev) => prev.filter((symbol) => symbol.id !== id))
    setSelectedTechnicalSymbolIds((prev) => prev.filter((symbolId) => symbolId !== id))
  }

  const handleDuplicateSelection = () => {
    if (selectedTechnicalSymbolIds.length > 0) {
      const duplicates = duplicateTechnicalSymbols(technicalSymbols, selectedTechnicalSymbolIds)
      if (duplicates.length === 0) return
      pushHistory()
      setTechnicalSymbols((prev) => [...prev, ...duplicates])
      setSelectedTechnicalSymbolIds(duplicates.map((symbol) => symbol.id))
      toast(`${duplicates.length} símbolo(s) duplicado(s).`)
      return
    }
    if (selectedDrawingId) {
      const drawing = drawings.find((item) => item.id === selectedDrawingId)
      if (!drawing) return
      pushHistory()
      const duplicate = {
        ...drawing,
        id: `drawing-${crypto.randomUUID()}`,
        x1: Math.min(100, drawing.x1 + 2.5),
        y1: Math.min(100, drawing.y1 + 2.5),
        x2: Math.min(100, drawing.x2 + 2.5),
        y2: Math.min(100, drawing.y2 + 2.5),
      }
      setDrawings((prev) => [...prev, duplicate])
      setSelectedDrawingId(duplicate.id)
      toast('Desenho duplicado.')
      return
    }
    if (selectedEquipmentIds.length > 0) {
      toast('Equipamentos cadastrados são únicos. Use a biblioteca para duplicar símbolos técnicos.', 'error')
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        handleDuplicateSelection()
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDrawingId) {
        event.preventDefault()
        handleDeleteSelectedDrawing()
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedManualConnectionId) {
        event.preventDefault()
        handleDeleteSelectedConnection()
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedTechnicalSymbolIds.length > 0) {
        event.preventDefault()
        pushHistory()
        setTechnicalSymbols((prev) => prev.filter((symbol) => !selectedTechnicalSymbolIds.includes(symbol.id)))
        setSelectedTechnicalSymbolIds([])
      }
      if (selectedEquipmentIds.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const step = event.shiftKey ? 2.5 : 0.5
        const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        pushHistory()
        setPositions((prev) => {
          const next = { ...prev }
          selectedEquipmentIds.forEach((id) => {
            const current = prev[id]
            if (!current) return
            next[id] = {
              ...current,
              x: Math.max(1, Math.min(99, current.x + deltaX)),
              y: Math.max(1, Math.min(99, current.y + deltaY))
            }
          })
          return next
        })
      }
      if (selectedTechnicalSymbolIds.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const step = event.shiftKey ? 2.5 : 0.5
        const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        pushHistory()
        setTechnicalSymbols((prev) => prev.map((symbol) => selectedTechnicalSymbolIds.includes(symbol.id)
          ? {
              ...symbol,
              x: Math.max(1, Math.min(99, symbol.x + deltaX)),
              y: Math.max(1, Math.min(99, symbol.y + deltaY)),
            }
          : symbol))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

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
        if (backgroundType === 'satellite') {
          setSatelliteUrl(url)
          await handleSave(positions, 'satellite', url)
        } else {
          setBgUrl(url)
          setBackgroundType('image')
          await handleSave(positions, 'image', url)
        }
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
  const positionedCameras = positionedEquipments.filter((equipment) => equipment.type === 'camera')
  const coverageAnalysis = analyzeCoverage(positionedCameras.flatMap((camera) => {
    const position = positions[camera.id]
    if (!position) return []
    const view = cameraViews[camera.id] || { angle: 70, range: 18, direction: 0, color: '#22d3ee' }
    return [{ x: position.x, y: position.y, angle: view.angle, range: view.range, direction: view.direction }]
  }))
  const equipmentById = new Map(equipments.map((equip) => [equip.id, equip]))
  const cableByCamera = new Map(cables.map((cable) => [cable.camera_id, cable]))
  const visualCableConnections = positionedEquipments
    .filter((equip) => {
      if (equip.type !== 'camera') return false
      const parentId = equip.switch_id || equip.dvr_id
      if (!parentId) return false
      return !!equipmentById.get(parentId) && !!positions[equip.id] && !!positions[parentId]
    })
    .map((camera) => {
      const parentId = (camera.switch_id || camera.dvr_id)!
      const parent = equipmentById.get(parentId)!
      const cable = cableByCamera.get(camera.id)
      const cableType = cable?.cable_type || (camera.connection_type === 'ip' ? 'utp_cat5' : 'coaxial_rg59')
      const color = getCableColor(cableType)
      const portLabel = camera.switch_id
        ? camera.switch_port ? `P${camera.switch_port}` : 'LAN'
        : camera.channel_number ? `CH${camera.channel_number}` : 'DVR'
      return {
        id: `${parentId}-${camera.id}`,
        camera,
        parent,
        source: positions[parentId],
        target: positions[camera.id],
        label: `${portLabel} · ${CABLE_TYPE_LABELS[cableType] || cableType}${cable?.cable_length_meters ? ` · ${cable.cable_length_meters}m` : ''}`,
        color,
        cable,
      }
    })

  const technicalSymbolById = new Map(technicalSymbols.map((symbol) => [symbol.id, symbol]))
  const getNodePosition = (id: string) => positions[id] || technicalSymbolById.get(id)
  const manualVisualConnections = manualConnections
    .filter((connection) => getNodePosition(connection.sourceId) && getNodePosition(connection.targetId))
    .map((connection) => ({
      ...connection,
      source: getNodePosition(connection.sourceId)!,
      target: getNodePosition(connection.targetId)!,
    }))
  const selectedManualConnection = manualConnections.find(
    (connection) => connection.id === selectedManualConnectionId,
  ) || null

  const cableTotals = cables.reduce<Record<string, { count: number; meters: number }>>((acc, cable) => {
    const current = acc[cable.cable_type] || { count: 0, meters: 0 }
    current.count += 1
    current.meters += cable.cable_length_meters || 0
    acc[cable.cable_type] = current
    return acc
  }, {})

  const materialCounts = {
    cameras: equipments.filter((item) => item.type === 'camera').length,
    dvrs: equipments.filter((item) => item.type === 'dvr').length,
    switches: equipments.filter((item) => item.type === 'switch').length,
    routers: equipments.filter((item) => item.type === 'router').length,
    baluns: equipments.filter((item) => item.type === 'balun').length,
    splices: cables.filter((cable) => cable.has_splice).length,
    poeCameras: equipments.filter((item) => item.type === 'camera' && (item.poe_powered || item.power_source_type === 'poe')).length,
    poweredCameras: equipments.filter((item) => item.type === 'camera' && item.power_source_type === 'power_supply').length,
    technicalNvrs: technicalSymbols.filter((item) => item.kind === 'nvr').length,
    technicalSources: technicalSymbols.filter((item) => item.kind === 'power_supply').length,
    technicalUps: technicalSymbols.filter((item) => item.kind === 'ups').length,
  }
  const capacitySummary = summarizeCapacity(
    equipments.filter((item) => item.type === 'camera').map((camera) => ({
      id: camera.id,
      switch_id: camera.switch_id || null,
      switch_port: camera.switch_port || null,
      dvr_id: camera.dvr_id || null,
      channel_number: camera.channel_number || null,
    })),
    equipments.filter((item) => item.type === 'switch').map((item) => ({ id: item.id, totalPorts: item.total_ports || 0 })),
    equipments.filter((item) => item.type === 'dvr').map((item) => ({ id: item.id, totalChannels: item.total_channels || 0 })),
  )
  const estimatedManualCableMeters = manualVisualConnections.reduce((sum, connection) => (
    sum + estimateConnectionLength(connection.source, connection.target, {
      widthMeters: planWidthMeters,
      heightMeters: planHeightMeters,
    })
  ), 0)
  const registeredCableMeters = Object.values(cableTotals).reduce((sum, item) => sum + item.meters, 0)
  const powerSupplyModels = Object.entries(equipments
    .filter((item) => item.type === 'camera' && item.power_source_type === 'power_supply')
    .reduce<Record<string, number>>((acc, camera) => {
      const label = [camera.power_supply_brand, camera.power_supply_model].filter(Boolean).join(' ') || 'Fonte não especificada'
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {}))

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
  const getEquipmentIcon = (equipment: EquipmentItem | Position['type'], className = 'w-4 h-4') => {
    const type = typeof equipment === 'string' ? equipment : equipment.type
    const cameraType = typeof equipment === 'string' ? '' : equipment.camera_type || ''
    switch (type) {
      case 'camera':
        if (cameraType === 'dome') return <Eye className={className} />
        if (cameraType === 'ptz') return <RefreshCw className={className} />
        if (cameraType === 'wifi' || cameraType === '360') return <Wifi className={className} />
        return <Video className={className} />
      case 'dvr':
        return <Server className={className} />
      case 'switch':
        return <Network className={className} />
      case 'router':
        return <Wifi className={className} />
      case 'balun':
        return <Cable className={className} />
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
      case 'balun':
        return 'Balun'
      default:
        return type
    }
  }

  const getTechnicalSymbolIcon = (kind: TechnicalSymbolKind, className = 'w-4 h-4') => {
    switch (kind) {
      case 'camera_dome':
        return <Eye className={className} />
      case 'camera_bullet':
        return <Video className={className} />
      case 'camera_ptz':
        return <RefreshCw className={className} />
      case 'camera_wifi':
        return <Wifi className={className} />
      case 'dvr':
        return <Server className={className} />
      case 'nvr':
        return <HardDrive className={className} />
      case 'switch':
        return <Network className={className} />
      case 'router':
        return <Wifi className={className} />
      case 'balun':
      case 'power_balun':
        return <Cable className={className} />
      case 'power_supply':
        return <Zap className={className} />
      case 'ups':
        return <BatteryCharging className={className} />
    }
  }

  const selectedCamera = activePreview
    ? equipments.find((equipment) => equipment.id === activePreview && equipment.type === 'camera') || null
    : null
  const selectedTechnicalSymbol = selectedTechnicalSymbolIds.length === 1
    ? technicalSymbols.find((symbol) => symbol.id === selectedTechnicalSymbolIds[0]) || null
    : null
  const selectedCameraView = selectedCamera
    ? cameraViews[selectedCamera.id] || { angle: 70, range: 18, direction: 0, color: '#22d3ee' }
    : null

  const updateSelectedCameraView = (patch: Partial<CameraViewConfig>) => {
    if (!selectedCamera || !selectedCameraView) return
    setCameraViews((prev) => ({
      ...prev,
      [selectedCamera.id]: { ...selectedCameraView, ...patch }
    }))
  }

  const toggleLayer = (layer: keyof FloorPlanLayers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  const alignSelectedEquipment = (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'distributeX' | 'distributeY') => {
    const selected = selectedEquipmentIds
      .map((id) => ({ id, position: positions[id] }))
      .filter((item): item is { id: string; position: Position } => Boolean(item.position))
    if (selected.length < 2) return
    if ((mode === 'distributeX' || mode === 'distributeY') && selected.length < 3) {
      toast('Selecione pelo menos três equipamentos para distribuir.', 'error')
      return
    }

    pushHistory()
    const xs = selected.map((item) => item.position.x)
    const ys = selected.map((item) => item.position.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const next = { ...positions }

    if (mode === 'distributeX') {
      selected.sort((a, b) => a.position.x - b.position.x).forEach((item, index) => {
        next[item.id] = { ...item.position, x: minX + ((maxX - minX) / (selected.length - 1)) * index }
      })
    } else if (mode === 'distributeY') {
      selected.sort((a, b) => a.position.y - b.position.y).forEach((item, index) => {
        next[item.id] = { ...item.position, y: minY + ((maxY - minY) / (selected.length - 1)) * index }
      })
    } else {
      selected.forEach((item) => {
        const x = mode === 'left' ? minX : mode === 'right' ? maxX : mode === 'centerX' ? (minX + maxX) / 2 : item.position.x
        const y = mode === 'top' ? minY : mode === 'bottom' ? maxY : mode === 'centerY' ? (minY + maxY) / 2 : item.position.y
        next[item.id] = { ...item.position, x: snapPercent(x), y: snapPercent(y) }
      })
    }
    setPositions(next)
  }

  const alignSelectedTechnicalSymbols = (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'distributeX' | 'distributeY') => {
    const selected = technicalSymbols.filter((symbol) => selectedTechnicalSymbolIds.includes(symbol.id))
    if (selected.length < 2) return
    if ((mode === 'distributeX' || mode === 'distributeY') && selected.length < 3) {
      toast('Selecione pelo menos três símbolos para distribuir.', 'error')
      return
    }
    pushHistory()
    const minX = Math.min(...selected.map((symbol) => symbol.x))
    const maxX = Math.max(...selected.map((symbol) => symbol.x))
    const minY = Math.min(...selected.map((symbol) => symbol.y))
    const maxY = Math.max(...selected.map((symbol) => symbol.y))
    const sortedX = [...selected].sort((a, b) => a.x - b.x)
    const sortedY = [...selected].sort((a, b) => a.y - b.y)
    const updates = new Map<string, Partial<TechnicalSymbol>>()

    if (mode === 'distributeX') {
      sortedX.forEach((symbol, index) => updates.set(symbol.id, { x: minX + ((maxX - minX) / (selected.length - 1)) * index }))
    } else if (mode === 'distributeY') {
      sortedY.forEach((symbol, index) => updates.set(symbol.id, { y: minY + ((maxY - minY) / (selected.length - 1)) * index }))
    } else {
      selected.forEach((symbol) => updates.set(symbol.id, {
        x: mode === 'left' ? minX : mode === 'right' ? maxX : mode === 'centerX' ? (minX + maxX) / 2 : symbol.x,
        y: mode === 'top' ? minY : mode === 'bottom' ? maxY : mode === 'centerY' ? (minY + maxY) / 2 : symbol.y,
      }))
    }
    setTechnicalSymbols((prev) => prev.map((symbol) => {
      const update = updates.get(symbol.id)
      return update ? { ...symbol, ...update } : symbol
    }))
  }

  const handleAlignSelection = (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'distributeX' | 'distributeY') => {
    if (selectedTechnicalSymbolIds.length > 0) alignSelectedTechnicalSymbols(mode)
    else alignSelectedEquipment(mode)
  }

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!mapRef.current || exporting) return
    setExporting(true)
    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#0b111e',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const safeName = (selectedClientName || 'cliente').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `planta-cftv-${safeName}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const ratio = Math.min((pageWidth - 16) / canvas.width, (pageHeight - 24) / canvas.height)
        const imageWidth = canvas.width * ratio
        const imageHeight = canvas.height * ratio
        pdf.setFontSize(12)
        pdf.text(`Planta CFTV - ${selectedClientName || 'Cliente'}`, 8, 10)
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 8, 14, imageWidth, imageHeight)
        pdf.save(`planta-cftv-${safeName}.pdf`)
      }
      toast(`Planta exportada em ${format.toUpperCase()}.`)
    } catch (err: any) {
      toast('Erro ao exportar planta: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleExportMaterialsCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['Categoria', 'Item', 'Quantidade', 'Metragem (m)'],
      ['Equipamento', 'Câmeras', materialCounts.cameras, ''],
      ['Equipamento', 'DVRs', materialCounts.dvrs, ''],
      ['Equipamento', 'Switches', materialCounts.switches, ''],
      ['Equipamento', 'Roteadores', materialCounts.routers, ''],
      ['Equipamento', 'Baluns', materialCounts.baluns, ''],
      ['Instalação', 'Emendas', materialCounts.splices, ''],
      ['Alimentação', 'Câmeras PoE', materialCounts.poeCameras, ''],
      ['Alimentação', 'Pontos com fonte', materialCounts.poweredCameras, ''],
      ['Capacidade', 'Portas de switch utilizadas', capacitySummary.usedSwitchPorts, ''],
      ['Capacidade', 'Portas de switch totais', capacitySummary.totalSwitchPorts, ''],
      ['Capacidade', 'Canais utilizados', capacitySummary.usedRecorderChannels, ''],
      ['Capacidade', 'Canais totais', capacitySummary.totalRecorderChannels, ''],
      ['Símbolo técnico', 'NVR', materialCounts.technicalNvrs, ''],
      ['Símbolo técnico', 'Fonte', materialCounts.technicalSources, ''],
      ['Símbolo técnico', 'Nobreak', materialCounts.technicalUps, ''],
      ['Cabeamento', 'Estimativa visual', manualConnections.length, estimatedManualCableMeters.toFixed(1).replace('.', ',')],
      ...Object.entries(cableTotals).map(([type, total]) => [
        'Cabeamento',
        CABLE_TYPE_LABELS[type] || type,
        total.count,
        total.meters.toFixed(1).replace('.', ','),
      ]),
    ]
    const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = (selectedClientName || 'cliente').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
    link.href = url
    link.download = `materiais-cftv-${safeName}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast('Lista de materiais exportada em CSV.')
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
                else fileInputRef.current?.click()
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
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="p-2 rounded-lg bg-bg-primary border border-border-light text-text-secondary hover:text-accent hover:border-accent/50 disabled:opacity-50"
            title="Exportar planta em PNG"
          >
            <FileImage className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="p-2 rounded-lg bg-bg-primary border border-border-light text-text-secondary hover:text-accent hover:border-accent/50 disabled:opacity-50"
            title="Exportar planta em PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Salvando...' : 'Salvar Planta'}
          </Button>

          <button
            onClick={() => setDrawMode('select')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${
              drawMode === 'select'
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-bg-primary hover:bg-bg-tertiary border-border-light text-text-primary'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Mover Equipamentos
          </button>
        </div>
      </header>

      {/* Configuração do fundo por satélite/foto aérea */}
      {backgroundType === 'satellite' && (
        <div className="bg-bg-secondary p-5 rounded-xl border border-border-light flex flex-col md:flex-row items-center gap-4">
          <Info className="w-8 h-8 text-accent shrink-0 animate-bounce" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-semibold text-text-primary">Configurar Imagem Aérea/Satélite</h4>
            <p className="text-xs text-text-muted">
              Abra o mapa para localizar o endereço, salve/recorte a imagem aérea e carregue a URL ou faça upload como imagem.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mt-2">
              <input
                type="text"
                placeholder="Endereço, cidade ou nome do cliente para abrir no mapa"
                className="w-full bg-bg-primary border border-border-light text-sm text-text-primary rounded-lg px-3 py-2 outline-none focus:border-accent"
                value={satelliteQuery}
                onChange={(e) => setSatelliteQuery(e.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={openSatelliteMap}>
                <ExternalLink className="w-4 h-4" />
                Abrir Mapa
              </Button>
            </div>
            <input
              type="text"
              placeholder="https://exemplo.com/minha-imagem-satelite.jpg"
              className="w-full bg-bg-primary border border-border-light text-sm text-text-primary rounded-lg px-3 py-2 mt-2 outline-none focus:border-accent"
              value={satelliteUrl}
              onChange={(e) => setSatelliteUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Button size="sm" onClick={() => handleSave(positions, 'satellite', satelliteUrl)}>
              Configurar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        </div>
      )}

      {/* Grid Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel Lateral: Equipamentos Disponíveis */}
        <div className="lg:col-span-1 bg-bg-secondary rounded-xl border border-border-light p-4 space-y-4 h-[650px] overflow-y-auto">
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

          <div className="space-y-3 rounded-xl border border-border-light bg-bg-primary/40 p-3">
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">Biblioteca de Símbolos</h3>
              <p className="text-[10px] text-text-muted mt-1">Referências gráficas independentes do inventário.</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TECHNICAL_SYMBOL_CATALOG.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => handleAddTechnicalSymbol(item.kind)}
                  className="min-w-0 flex items-center gap-2 px-2 py-2 rounded-lg border border-border-light bg-bg-primary text-left text-[9px] text-text-secondary hover:border-accent/50 hover:text-accent transition-colors"
                  title={`Adicionar ${item.label}`}
                >
                  <span className="w-7 h-7 rounded-md border border-accent/30 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    {getTechnicalSymbolIcon(item.kind, 'w-3.5 h-3.5')}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
            {technicalSymbols.length > 0 && (
              <div className="pt-2 border-t border-border-light space-y-1.5">
                <p className="text-[9px] uppercase tracking-wider text-text-muted">Símbolos no mapa ({technicalSymbols.length})</p>
                {technicalSymbols.map((symbol) => (
                  <div key={symbol.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-bg-primary border border-border-light">
                    <span className="text-accent shrink-0">{getTechnicalSymbolIcon(symbol.kind, 'w-3 h-3')}</span>
                    <span className="text-[9px] text-text-secondary truncate flex-1">{symbol.label}</span>
                    <button type="button" onClick={() => handleRemoveTechnicalSymbol(symbol.id)} className="p-1 text-text-muted hover:text-rose-400" title="Remover símbolo">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border-light bg-bg-primary/40 p-3">
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">Desenho no Grid</h3>
              <p className="text-[10px] text-text-muted mt-1">Clique e arraste para criar linhas, paredes, rotas ou áreas.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDrawMode('select')}
                className={`px-2 py-2 rounded-lg border text-[10px] flex items-center justify-center gap-1 ${drawMode === 'select' ? 'bg-accent text-on-accent border-accent' : 'bg-bg-primary border-border-light text-text-secondary'}`}
              >
                <MousePointer2 className="w-3.5 h-3.5" /> Seleção
              </button>
              <button
                type="button"
                onClick={() => setDrawMode('line')}
                className={`px-2 py-2 rounded-lg border text-[10px] flex items-center justify-center gap-1 ${drawMode === 'line' ? 'bg-accent text-on-accent border-accent' : 'bg-bg-primary border-border-light text-text-secondary'}`}
              >
                <Minus className="w-3.5 h-3.5" /> Linha
              </button>
              <button
                type="button"
                onClick={() => setDrawMode('rect')}
                className={`px-2 py-2 rounded-lg border text-[10px] flex items-center justify-center gap-1 ${drawMode === 'rect' ? 'bg-accent text-on-accent border-accent' : 'bg-bg-primary border-border-light text-text-secondary'}`}
              >
                <Square className="w-3.5 h-3.5" /> Área
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawMode('cable')
                  setSelectedDrawingId(null)
                  setSelectedEquipmentIds([])
                }}
                className={`px-2 py-2 rounded-lg border text-[10px] flex items-center justify-center gap-1 ${drawMode === 'cable' ? 'bg-accent text-on-accent border-accent' : 'bg-bg-primary border-border-light text-text-secondary'}`}
              >
                <Cable className="w-3.5 h-3.5" /> Cabo
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <label className="flex items-center gap-2 px-2 py-2 rounded-lg bg-bg-primary border border-border-light text-[10px] text-text-secondary">
                <Palette className="w-3.5 h-3.5" />
                Cor
                <input
                  type="color"
                  value={drawColor}
                  onChange={(event) => setDrawColor(event.target.value)}
                  className="ml-auto h-6 w-8 bg-transparent"
                />
              </label>
              <label className="px-2 py-2 rounded-lg bg-bg-primary border border-border-light text-[10px] text-text-secondary">
                {drawWidth}px
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={drawWidth}
                  onChange={(event) => setDrawWidth(Number(event.target.value))}
                  className="block w-20 accent-cyan-500"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={handleUndo} disabled={historyRef.current.length === 0} className="justify-center">
                <Undo2 className="w-3.5 h-3.5" /> Desfazer
              </Button>
              <Button size="sm" variant="secondary" onClick={handleRedo} disabled={futureRef.current.length === 0} className="justify-center">
                <Redo2 className="w-3.5 h-3.5" /> Refazer
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[10px] text-text-secondary cursor-pointer">
              <input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} className="accent-cyan-500" />
              Encaixar automaticamente no grid
            </label>
            {selectedDrawingId && (
              <Button size="sm" variant="secondary" onClick={handleDeleteSelectedDrawing} className="w-full justify-center">
                <Trash2 className="w-3.5 h-3.5" />
                Apagar Desenho
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border-light bg-bg-primary/40 p-3">
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                <Cable className="w-3.5 h-3.5 text-accent" /> Cabeamento Manual
              </h3>
              <p className="text-[10px] text-text-muted mt-1">
                No modo Cabo, clique na origem e depois no destino.
              </p>
            </div>

            {pendingConnectionSourceId && (
              <div className="px-3 py-2 rounded-lg border border-accent/40 bg-accent/10 text-[10px] text-text-secondary">
                Origem: <strong className="text-accent">{equipmentById.get(pendingConnectionSourceId)?.name || technicalSymbolById.get(pendingConnectionSourceId)?.label}</strong>
                <button
                  type="button"
                  onClick={() => setPendingConnectionSourceId(null)}
                  className="block mt-1 text-text-muted hover:text-text-primary"
                >
                  Cancelar seleção
                </button>
              </div>
            )}

            {selectedManualConnection ? (
              <div className="space-y-2">
                <label className="block text-[10px] text-text-secondary">
                  Identificação
                  <input
                    type="text"
                    value={selectedManualConnection.label}
                    onFocus={pushHistory}
                    onChange={(event) => updateManualConnection(selectedManualConnection.id, { label: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </label>
                <label className="block text-[10px] text-text-secondary">
                  Tipo de cabo
                  <select
                    value={selectedManualConnection.cableType}
                    onPointerDown={pushHistory}
                    onChange={(event) => updateManualConnection(selectedManualConnection.id, {
                      cableType: event.target.value,
                      color: getCableColor(event.target.value),
                    })}
                    className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  >
                    {Object.entries(CABLE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      pushHistory()
                      updateManualConnection(selectedManualConnection.id, { lineStyle: 'solid' })
                    }}
                    className={`px-2 py-2 rounded-lg border text-[10px] ${selectedManualConnection.lineStyle === 'solid' ? 'border-accent text-accent bg-accent/10' : 'border-border-light text-text-muted bg-bg-primary'}`}
                  >
                    Linha contínua
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pushHistory()
                      updateManualConnection(selectedManualConnection.id, { lineStyle: 'dashed' })
                    }}
                    className={`px-2 py-2 rounded-lg border text-[10px] ${selectedManualConnection.lineStyle === 'dashed' ? 'border-accent text-accent bg-accent/10' : 'border-border-light text-text-muted bg-bg-primary'}`}
                  >
                    Linha pontilhada
                  </button>
                </div>
                <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border-light bg-bg-primary text-[10px] text-text-secondary">
                  Cor da conexão
                  <input
                    type="color"
                    value={selectedManualConnection.color}
                    onPointerDown={pushHistory}
                    onChange={(event) => updateManualConnection(selectedManualConnection.id, { color: event.target.value })}
                    className="ml-auto h-6 w-9 bg-transparent"
                  />
                </label>
                <Button size="sm" variant="secondary" onClick={handleDeleteSelectedConnection} className="w-full justify-center">
                  <Trash2 className="w-3.5 h-3.5" /> Remover Conexão
                </Button>
              </div>
            ) : (
              <p className="text-[10px] text-text-muted">
                {manualConnections.length} conexão(ões) manual(is). Clique em uma linha para editar.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border-light bg-bg-primary/40 p-3">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">Mover Página</h3>
            <label className="block text-[10px] text-text-secondary">
              Horizontal
              <input
                type="range"
                min="-400"
                max="400"
                value={panX}
                onChange={(event) => setPanX(Number(event.target.value))}
                className="w-full accent-cyan-500"
              />
            </label>
            <label className="block text-[10px] text-text-secondary">
              Vertical
              <input
                type="range"
                min="-300"
                max="300"
                value={panY}
                onChange={(event) => setPanY(Number(event.target.value))}
                className="w-full accent-cyan-500"
              />
            </label>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPanX(0)
                setPanY(0)
              }}
              className="w-full justify-center"
            >
              Centralizar Página
            </Button>
          </div>

          <hr className="border-border-light" />

          <div className="space-y-4 pr-1">
            <div className="rounded-xl border border-border-light bg-bg-primary/40 p-3 space-y-2">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-accent" /> Camadas
              </h3>
              {([
                ['background', 'Fundo / planta'],
                ['drawings', 'Desenhos e áreas'],
                ['cables', 'Cabeamento'],
                ['fieldsOfView', 'Campo de visão'],
                ['blindSpots', 'Pontos cegos'],
                ['equipment', 'Equipamentos'],
              ] as [keyof FloorPlanLayers, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 text-[10px] text-text-secondary cursor-pointer">
                  <span>{label}</span>
                  <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} className="accent-cyan-500" />
                </label>
              ))}
              <div className="flex items-center justify-between border-t border-border-light pt-2 text-[10px]">
                <span className="text-text-muted">Cobertura estimada</span>
                <span className={`font-mono font-bold ${coverageAnalysis.coveragePercentage >= 80 ? 'text-emerald-400' : coverageAnalysis.coveragePercentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {positionedCameras.length > 0 ? `${coverageAnalysis.coveragePercentage}%` : '--'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-bg-primary/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">Organização</h3>
                <span className="text-[9px] text-accent font-mono">{selectedEquipmentIds.length + selectedTechnicalSymbolIds.length} selecionado(s)</span>
              </div>
              <p className="text-[9px] text-text-muted">Use Shift + clique para selecionar vários. Setas movem; Shift + seta acelera.</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => handleAlignSelection('left')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Esquerda</button>
                <button onClick={() => handleAlignSelection('centerX')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Centro H</button>
                <button onClick={() => handleAlignSelection('right')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Direita</button>
                <button onClick={() => handleAlignSelection('top')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Topo</button>
                <button onClick={() => handleAlignSelection('centerY')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Centro V</button>
                <button onClick={() => handleAlignSelection('bottom')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 2} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Base</button>
                <button onClick={() => handleAlignSelection('distributeX')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 3} className="col-span-1 px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Distribuir H</button>
                <button onClick={() => handleAlignSelection('distributeY')} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length < 3} className="col-span-1 px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Distribuir V</button>
                <button onClick={() => { setSelectedEquipmentIds([]); setSelectedTechnicalSymbolIds([]) }} disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length === 0} className="px-2 py-1.5 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary disabled:opacity-40">Limpar</button>
              </div>
              <button
                type="button"
                onClick={handleDuplicateSelection}
                disabled={selectedEquipmentIds.length + selectedTechnicalSymbolIds.length === 0 && !selectedDrawingId}
                className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded bg-bg-primary border border-border-light text-[9px] text-text-secondary hover:text-accent disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicar seleção
              </button>
            </div>

            {selectedTechnicalSymbol && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest">Símbolo Selecionado</h3>
                <label className="block text-[10px] text-text-secondary">
                  Identificação
                  <input
                    type="text"
                    value={selectedTechnicalSymbol.label}
                    onFocus={pushHistory}
                    onChange={(event) => setTechnicalSymbols((prev) => prev.map((symbol) => symbol.id === selectedTechnicalSymbol.id ? { ...symbol, label: event.target.value } : symbol))}
                    className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </label>
                <Button size="sm" variant="secondary" onClick={() => handleRemoveTechnicalSymbol(selectedTechnicalSymbol.id)} className="w-full justify-center">
                  <Trash2 className="w-3.5 h-3.5" /> Remover Símbolo
                </Button>
              </div>
            )}

            {selectedCamera && selectedCameraView && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-3">
                <h3 className="font-bold text-cyan-200 text-xs uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> Campo de Visão
                </h3>
                <p className="text-[10px] text-text-muted truncate">{selectedCamera.name}</p>
                <label className="block text-[10px] text-text-secondary">
                  Direção: {selectedCameraView.direction}°
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={selectedCameraView.direction}
                    onPointerDown={pushHistory}
                    onChange={(event) => updateSelectedCameraView({ direction: Number(event.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </label>
                <label className="block text-[10px] text-text-secondary">
                  Abertura: {selectedCameraView.angle}°
                  <input
                    type="range"
                    min="20"
                    max="180"
                    value={selectedCameraView.angle}
                    onPointerDown={pushHistory}
                    onChange={(event) => updateSelectedCameraView({ angle: Number(event.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </label>
                <label className="block text-[10px] text-text-secondary">
                  Alcance visual: {selectedCameraView.range}
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={selectedCameraView.range}
                    onPointerDown={pushHistory}
                    onChange={(event) => updateSelectedCameraView({ range: Number(event.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-[10px] text-text-secondary">
                  Cor
                  <input type="color" value={selectedCameraView.color} onChange={(event) => updateSelectedCameraView({ color: event.target.value })} />
                </label>
              </div>
            )}

            <div className="rounded-xl border border-border-light bg-bg-primary/40 p-3 space-y-3">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                <PackageOpen className="w-3.5 h-3.5 text-accent" /> Materiais do Projeto
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-text-muted">
                  Largura da planta (m)
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={planWidthMeters}
                    onChange={(event) => setPlanWidthMeters(Math.max(1, Number(event.target.value) || 1))}
                    className="mt-1 w-full rounded-md border border-border-light bg-bg-primary px-2 py-1.5 text-[10px] text-text-primary"
                  />
                </label>
                <label className="text-[9px] text-text-muted">
                  Altura da planta (m)
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={planHeightMeters}
                    onChange={(event) => setPlanHeightMeters(Math.max(1, Number(event.target.value) || 1))}
                    className="mt-1 w-full rounded-md border border-border-light bg-bg-primary px-2 py-1.5 text-[10px] text-text-primary"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <span className="text-text-muted">Câmeras</span><strong className="text-text-primary text-right">{materialCounts.cameras}</strong>
                <span className="text-text-muted">DVRs</span><strong className="text-text-primary text-right">{materialCounts.dvrs}</strong>
                <span className="text-text-muted">Switches</span><strong className="text-text-primary text-right">{materialCounts.switches}</strong>
                <span className="text-text-muted">Roteadores</span><strong className="text-text-primary text-right">{materialCounts.routers}</strong>
                <span className="text-text-muted">Baluns</span><strong className="text-text-primary text-right">{materialCounts.baluns}</strong>
                <span className="text-text-muted">Emendas</span><strong className="text-text-primary text-right">{materialCounts.splices}</strong>
                <span className="text-text-muted">Câmeras PoE</span><strong className="text-text-primary text-right">{materialCounts.poeCameras}</strong>
                <span className="text-text-muted">Pontos com fonte</span><strong className="text-text-primary text-right">{materialCounts.poweredCameras}</strong>
                <span className="text-text-muted">Portas de switch</span><strong className="text-text-primary text-right">{capacitySummary.usedSwitchPorts}/{capacitySummary.totalSwitchPorts}</strong>
                <span className="text-text-muted">Canais DVR/NVR</span><strong className="text-text-primary text-right">{capacitySummary.usedRecorderChannels}/{capacitySummary.totalRecorderChannels}</strong>
                <span className="text-text-muted">NVRs no desenho</span><strong className="text-text-primary text-right">{materialCounts.technicalNvrs}</strong>
                <span className="text-text-muted">Fontes no desenho</span><strong className="text-text-primary text-right">{materialCounts.technicalSources}</strong>
                <span className="text-text-muted">Nobreaks no desenho</span><strong className="text-text-primary text-right">{materialCounts.technicalUps}</strong>
              </div>
              <div className="rounded-lg border border-border-light bg-bg-primary/60 p-2 space-y-1 text-[10px]">
                <div className="flex justify-between gap-2"><span className="text-text-muted">Cabos cadastrados</span><strong className="text-text-primary">{registeredCableMeters.toFixed(1)}m</strong></div>
                <div className="flex justify-between gap-2"><span className="text-text-muted">Estimativa das linhas</span><strong className="text-accent">{estimatedManualCableMeters.toFixed(1)}m</strong></div>
                <p className="text-[8px] text-text-muted">Estimativa em linha reta conforme as dimensões informadas.</p>
              </div>
              {powerSupplyModels.length > 0 && (
                <div className="pt-2 border-t border-border-light space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-text-muted">Fontes vinculadas às câmeras</p>
                  {powerSupplyModels.map(([label, count]) => (
                    <div key={label} className="flex justify-between gap-2 text-[10px]">
                      <span className="text-text-muted truncate">{label}</span>
                      <strong className="text-text-primary">{count}</strong>
                    </div>
                  ))}
                </div>
              )}
              {Object.entries(cableTotals).length > 0 && (
                <div className="pt-2 border-t border-border-light space-y-1.5">
                  {Object.entries(cableTotals).map(([type, total]) => (
                    <div key={type} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="flex items-center gap-2 text-text-muted truncate">
                        <span
                          className="w-5 border-t-2 border-dashed shrink-0"
                          style={{ borderColor: getCableColor(type) }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{CABLE_TYPE_LABELS[type] || type}</span>
                      </span>
                      <span className="text-text-primary font-mono shrink-0">{total.count} trecho(s) · {total.meters.toFixed(1)}m</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleExportMaterialsCsv}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border-light bg-bg-primary text-[10px] font-bold uppercase text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Exportar materiais CSV
              </button>
            </div>

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
                          {getEquipmentIcon(equip, 'w-3.5 h-3.5')}
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
                            {getEquipmentIcon(equip, 'w-3 h-3')}
                          </div>
                          <p className="text-xs text-text-secondary truncate">{equip.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddEquipment(equip.id, equip.type)}
                            className="p-1 text-text-muted hover:text-accent transition-colors"
                            title="Reposicionar no centro"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveEquipment(equip.id)}
                            className="p-1 text-text-muted hover:text-rose-400 transition-colors"
                            title="Remover do mapa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
          <div className="absolute top-4 left-4 z-30 px-3 py-2 rounded-lg border border-border-light bg-bg-primary/85 backdrop-blur-md text-[10px] text-text-secondary">
            {drawMode === 'select'
              ? 'Modo mover: arraste qualquer dispositivo para posicionar'
              : drawMode === 'line'
                ? 'Modo linha: clique e arraste no mapa'
                : drawMode === 'rect'
                  ? 'Modo área: clique e arraste no mapa'
                  : pendingConnectionSourceId
                    ? 'Modo cabo: clique no equipamento de destino'
                    : 'Modo cabo: clique no equipamento de origem'}
          </div>
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
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                backgroundImage:
                  layers.background && backgroundType === 'image' && bgUrl
                    ? `url("${bgPreviewUrl || bgUrl}")`
                    : layers.background && backgroundType === 'satellite' && satelliteUrl
                    ? `url("${satellitePreviewUrl || satelliteUrl}")`
                    : undefined,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: backgroundType === 'grid' ? '#0b111e' : '#181e2b'
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => setDraftDrawing(null)}
            >
              {/* Se o fundo for Grid, exibimos um grid técnico */}
              {layers.background && backgroundType === 'grid' && (
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

              {layers.blindSpots && positionedCameras.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[4]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <pattern id="blind-spot-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="2" stroke="#f43f5e" strokeWidth="0.35" opacity="0.45" />
                    </pattern>
                  </defs>
                  {coverageAnalysis.blindCells.map((cell, index) => (
                    <rect
                      key={`blind-${index}`}
                      x={cell.x}
                      y={cell.y}
                      width={cell.width}
                      height={cell.height}
                      fill="url(#blind-spot-hatch)"
                      stroke="#f43f5e"
                      strokeWidth="0.12"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}

              {layers.fieldsOfView && positionedCameras.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {positionedCameras.map((camera) => {
                    const pos = positions[camera.id]
                    if (!pos) return null
                    const view = cameraViews[camera.id] || { angle: 70, range: 18, direction: 0, color: '#22d3ee' }
                    const startAngle = (view.direction - view.angle / 2) * Math.PI / 180
                    const endAngle = (view.direction + view.angle / 2) * Math.PI / 180
                    const startX = pos.x + Math.cos(startAngle) * view.range
                    const startY = pos.y + Math.sin(startAngle) * view.range
                    const endX = pos.x + Math.cos(endAngle) * view.range
                    const endY = pos.y + Math.sin(endAngle) * view.range
                    const largeArc = view.angle > 180 ? 1 : 0
                    const path = `M ${pos.x} ${pos.y} L ${startX} ${startY} A ${view.range} ${view.range} 0 ${largeArc} 1 ${endX} ${endY} Z`
                    return (
                      <path
                        key={`fov-${camera.id}`}
                        d={path}
                        fill={`${view.color}26`}
                        stroke={view.color}
                        strokeWidth="1.4"
                        strokeDasharray="4 3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                </svg>
              )}

              {layers.drawings && (drawings.length > 0 || draftDrawing) && (
                <svg
                  className={`absolute inset-0 w-full h-full z-10 overflow-visible ${drawMode === 'select' ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {[...drawings, ...(draftDrawing ? [draftDrawing] : [])].map((drawing) => {
                    const x = Math.min(drawing.x1, drawing.x2)
                    const y = Math.min(drawing.y1, drawing.y2)
                    const width = Math.abs(drawing.x2 - drawing.x1)
                    const height = Math.abs(drawing.y2 - drawing.y1)
                    const isSelected = selectedDrawingId === drawing.id

                    if (drawing.type === 'line') {
                      return (
                        <line
                          key={drawing.id}
                          x1={drawing.x1}
                          y1={drawing.y1}
                          x2={drawing.x2}
                          y2={drawing.y2}
                          stroke={drawing.color}
                          strokeWidth={isSelected ? drawing.width + 1 : drawing.width}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedDrawingId(drawing.id)
                          }}
                        />
                      )
                    }

                    return (
                      <rect
                        key={drawing.id}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={`${drawing.color}18`}
                        stroke={drawing.color}
                        strokeWidth={isSelected ? drawing.width + 1 : drawing.width}
                        vectorEffect="non-scaling-stroke"
                        className="cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedDrawingId(drawing.id)
                        }}
                      />
                    )
                  })}
                </svg>
              )}

              {/* Conexões físicas de cabeamento */}
              {layers.cables && visualCableConnections.length > 0 && (
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

                  {visualCableConnections.map((conn) => {
                    const isActive =
                      (conn.camera.status === 'ativo' || conn.camera.status === 'online') &&
                      (conn.parent.status === 'ativo' || conn.parent.status === 'online')
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
                          stroke={isActive ? conn.color : '#64748b'}
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

              {layers.cables && manualVisualConnections.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-[15] overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {manualVisualConnections.map((connection) => {
                    const midX = (connection.source.x + connection.target.x) / 2
                    const midY = (connection.source.y + connection.target.y) / 2
                    const pathData = `M ${connection.source.x} ${connection.source.y} L ${connection.target.x} ${connection.target.y}`
                    const isSelected = selectedManualConnectionId === connection.id
                    return (
                      <g key={connection.id}>
                        {isSelected && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#f8fafc"
                            strokeWidth="5"
                            opacity="0.35"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={connection.color}
                          strokeWidth={isSelected ? 3 : 2.2}
                          strokeDasharray={connection.lineStyle === 'dashed' ? '7 5' : undefined}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={pathData}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="14"
                          vectorEffect="non-scaling-stroke"
                          className="pointer-events-auto cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedManualConnectionId(connection.id)
                            setSelectedDrawingId(null)
                            setPendingConnectionSourceId(null)
                          }}
                        />
                        {connection.label && (
                          <text
                            x={midX}
                            y={midY - 1.5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-slate-100 font-mono font-bold pointer-events-none"
                            fontSize="2.5"
                            stroke="#0f172a"
                            strokeWidth="0.7"
                            paintOrder="stroke"
                            vectorEffect="non-scaling-stroke"
                          >
                            {connection.label}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              )}

              {layers.equipment && technicalSymbols.map((symbol) => {
                const isSelected = selectedTechnicalSymbolIds.includes(symbol.id)
                return (
                  <motion.div
                    key={`${symbol.id}-${symbol.x}-${symbol.y}`}
                    drag={drawMode === 'select'}
                    dragMomentum={false}
                    dragElastic={0}
                    dragSnapToOrigin
                    onDragStart={() => {
                      if (!selectedTechnicalSymbolIds.includes(symbol.id)) setSelectedTechnicalSymbolIds([symbol.id])
                      setSelectedEquipmentIds([])
                    }}
                    onDragEnd={(_, info) => handleTechnicalSymbolDragEnd(symbol.id, info)}
                    className={`absolute z-20 select-none ${drawMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                    style={{ left: `${symbol.x}%`, top: `${symbol.y}%`, x: '-50%', y: '-50%' }}
                  >
                    <button
                      type="button"
                      aria-label={`Símbolo ${symbol.label}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (drawMode === 'cable') {
                          handleEquipmentConnectionClick(symbol.id)
                          return
                        }
                        if (drawMode !== 'select') return
                        setSelectedEquipmentIds([])
                        setSelectedDrawingId(null)
                        setSelectedManualConnectionId(null)
                        setSelectedTechnicalSymbolIds((prev) => event.shiftKey
                          ? prev.includes(symbol.id) ? prev.filter((id) => id !== symbol.id) : [...prev, symbol.id]
                          : [symbol.id])
                      }}
                      className={`relative w-10 h-10 rounded-md flex items-center justify-center border-2 bg-slate-900/90 text-cyan-300 shadow-lg transition-all ${isSelected ? 'border-accent ring-2 ring-accent/50 scale-110' : 'border-cyan-500/50'}`}
                    >
                      {getTechnicalSymbolIcon(symbol.kind, 'w-5 h-5')}
                    </button>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap max-w-36 truncate rounded bg-slate-950/85 px-1.5 py-0.5 text-[8px] font-bold text-slate-100">
                      {symbol.label}
                    </span>
                  </motion.div>
                )
              })}

              {/* Renderização dos Pinos dos Equipamentos no Canvas */}
              {layers.equipment && positionedEquipments.map((equip) => {
                const pos = positions[equip.id]
                if (!pos) return null

                const statusStyle = getStatusColorClass(equip.status)
                const isOnline = equip.status === 'ativo' || equip.status === 'online'
                const isPreviewing = activePreview === equip.id
                const isSelected = selectedEquipmentIds.includes(equip.id)

                return (
                <motion.div
                    key={`${equip.id}-${pos.x}-${pos.y}`}
                    drag={drawMode === 'select'}
                    dragMomentum={false}
                    dragElastic={0}
                    dragSnapToOrigin
                    onDragStart={() => {
                      setActivePreview(null)
                      setSelectedTechnicalSymbolIds([])
                      if (!selectedEquipmentIds.includes(equip.id)) setSelectedEquipmentIds([equip.id])
                    }}
                    onDragEnd={(e, info) => handleDragEnd(equip.id, info)}
                    className={`absolute z-20 select-none ${drawMode === 'select' ? 'cursor-grab active:cursor-grabbing' : drawMode === 'cable' ? 'cursor-crosshair' : 'cursor-default'}`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      x: '-50%',
                      y: '-50%'
                    }}
                    whileHover={{ scale: drawMode === 'select' ? 1.05 : 1.15 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Equipamento ${equip.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (drawMode === 'cable') {
                          handleEquipmentConnectionClick(equip.id)
                          return
                        }
                        if (drawMode === 'select') {
                          setSelectedTechnicalSymbolIds([])
                          if (e.shiftKey) {
                            setSelectedEquipmentIds((prev) => prev.includes(equip.id)
                              ? prev.filter((id) => id !== equip.id)
                              : [...prev, equip.id])
                          } else {
                            setSelectedEquipmentIds([equip.id])
                          }
                          setActivePreview(isPreviewing ? null : equip.id)
                        }
                      }}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${statusStyle.bg} ${
                        pendingConnectionSourceId === equip.id
                          ? 'ring-4 ring-amber-400 scale-110'
                          : isPreviewing || isSelected ? 'ring-2 ring-accent scale-110' : ''
                      }`}
                    >
                      {getEquipmentIcon(equip, 'w-4.5 h-4.5')}

                      {/* Sinalização de pulso ativo */}
                      {isOnline && (
                        <span
                          className={`absolute inset-0 rounded-full animate-ping opacity-25 -z-10 ${statusStyle.pulse}`}
                        />
                      )}

                      {/* Pequena tag indicativa do tipo */}
                      <span className="absolute -top-1 -right-1 bg-bg-secondary text-text-primary text-[7px] px-1 rounded border border-border-light scale-90 uppercase font-mono">
                        {equip.type === 'camera' ? equip.camera_type || 'cam' : equip.type}
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
