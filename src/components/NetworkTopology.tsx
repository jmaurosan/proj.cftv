import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Network,
  Server,
  Video,
  Wifi,
  Globe,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ExternalLink,
  Edit2,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Save,
  Trash2,
  Plus,
  Link2,
  Package,
  Cable,
  Upload,
  Monitor,
  Layers3,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../hooks/useAuth'
import {
  deleteInstallationPhoto,
  getInstallationPhotoUrl,
  uploadInstallationPhoto,
} from '../services/storageService'
import { useToast } from './ui/Toast'
import Button from './ui/Button'
import LoadingSpinner from './ui/LoadingSpinner'
import { buildAutomaticTopologyConnections } from '../lib/automaticTopology'
import {
  buildOrthogonalTopologyPath,
  computeAutomaticTopologyLayout,
  type TopologyLane,
} from '../lib/topologyLayout'

interface TopologyNode {
  id: string
  name: string
  type: 'internet' | 'router' | 'switch' | 'dvr' | 'camera' | 'camera-group' | 'rack' | 'balun' | 'monitor'
  status: string
  ip_address: string | null
  location: string
  brand?: string | null
  model?: string | null
  // Fase 2 — para agrupamento visual e links wireless
  site_id?: string | null
  router_mode?: string | null
  paired_router_id?: string | null
  powered_by_poe_injector?: boolean
}

interface TopologySite {
  id: string
  name: string
  site_type: string
}

interface TopologyConnection {
  id: string
  source: string
  target: string
  active: boolean
  label?: string
  style?: 'dashed' | 'solid'
  manual?: boolean
  medium?: 'wan' | 'lan' | 'poe' | 'coaxial' | 'utp-video' | 'video'
}

interface SwitchPortTopologyRow {
  switch_id: string
  port_number: number
  device_type: string | null
  device_id: string | null
  device_name: string | null
  is_active: boolean
}

interface TopologyBuildContext {
  connections: TopologyConnection[]
}

interface TopologyRack {
  id: string
  databaseId?: string
  name: string
  location: string
  notes?: string
  equipmentIds?: string[]
  hasNobreak?: boolean
  powerNotes?: string
  cableNotes?: string
  mediaPaths?: string[]
}

const TOPOLOGY_NODE_WIDTH = 168
const TOPOLOGY_NODE_HEIGHT = 58
const TOPOLOGY_CANVAS_MARGIN = 90
const TOPOLOGY_GRID_SIZE = 24

export default function NetworkTopology() {
  const { selectedClientId, selectedClientName } = useClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const containerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(0.8)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [viewMode, setViewMode] = useState<'presentation' | 'technical'>('presentation')
  const [expandedCameraParents, setExpandedCameraParents] = useState<string[]>([])

  // Layout persistido no campo `notes` do cliente
  const [textNotes, setTextNotes] = useState('')
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [useManualConnections, setUseManualConnections] = useState(false)
  const [manualConnections, setManualConnections] = useState<TopologyConnection[]>([])
  const [manualSource, setManualSource] = useState('')
  const [manualTarget, setManualTarget] = useState('')
  const [manualLabel, setManualLabel] = useState('')
  const [manualStyle, setManualStyle] = useState<'dashed' | 'solid'>('dashed')
  const [topologyRacks, setTopologyRacks] = useState<TopologyRack[]>([])
  const [editingRackId, setEditingRackId] = useState('')
  const [newRackName, setNewRackName] = useState('')
  const [newRackLocation, setNewRackLocation] = useState('')
  const [newRackEquipmentIds, setNewRackEquipmentIds] = useState<string[]>([])
  const [newRackHasNobreak, setNewRackHasNobreak] = useState(false)
  const [newRackPowerNotes, setNewRackPowerNotes] = useState('')
  const [newRackCableNotes, setNewRackCableNotes] = useState('')
  const [newRackMediaPaths, setNewRackMediaPaths] = useState<string[]>([])
  const [rackMediaPreviews, setRackMediaPreviews] = useState<Record<string, string | null>>({})
  const [uploadingRackMedia, setUploadingRackMedia] = useState(false)

  // Nós e conexões
  const [nodes, setNodes] = useState<TopologyNode[]>([])
  const [connections, setConnections] = useState<TopologyConnection[]>([])
  const [autoConnections, setAutoConnections] = useState<TopologyConnection[]>([])
  // Fase 2 — sites físicos para agrupamento visual
  const [sites, setSites] = useState<TopologySite[]>([])
  
  // Equipamento selecionado para detalhamento
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const presentationGraph = useMemo(() => {
    if (viewMode === 'technical') return { nodes, connections }

    const cameraById = new Map(nodes.filter((node) => node.type === 'camera').map((node) => [node.id, node]))
    const camerasByParent = new Map<string, TopologyNode[]>()
    connections.forEach((connection) => {
      const camera = cameraById.get(connection.target)
      if (!camera) return
      camerasByParent.set(connection.source, [...(camerasByParent.get(connection.source) ?? []), camera])
    })

    const groupedCameraIds = new Set<string>()
    const groupNodes: TopologyNode[] = []
    const groupConnections: TopologyConnection[] = []
    camerasByParent.forEach((cameras, parentId) => {
      if (cameras.length < 2 || expandedCameraParents.includes(parentId)) return
      // Fase 2: se as câmeras pertencem a sites diferentes, não agrupar —
      // deixar cada uma aparecer individualmente para o cluster de site funcionar
      const distinctSiteIds = new Set(cameras.map((c) => c.site_id).filter(Boolean))
      if (distinctSiteIds.size > 1) return
      cameras.forEach((camera) => groupedCameraIds.add(camera.id))
      const activeCount = cameras.filter((camera) => camera.status === 'ativo' || camera.status === 'online').length
      const groupId = `camera-group-${parentId}`
      // Se todas as câmeras do grupo compartilham o mesmo site, o grupo herda esse site
      const sharedSiteId = distinctSiteIds.size === 1 ? [...distinctSiteIds][0] : null
      groupNodes.push({
        id: groupId,
        name: `${cameras.length} câmeras`,
        type: 'camera-group',
        status: activeCount === cameras.length ? 'ativo' : activeCount > 0 ? 'warning' : 'inativo',
        ip_address: `${activeCount} ativas · ${cameras.length - activeCount} inativas`,
        location: `Ligadas a ${nodes.find((node) => node.id === parentId)?.name ?? 'equipamento'}`,
        model: 'Toque para detalhar',
        site_id: sharedSiteId,
      })
      groupConnections.push({
        id: `group-${parentId}`,
        source: parentId,
        target: groupId,
        active: activeCount > 0,
        label: `${cameras.length} pontos`,
        style: 'solid',
        medium: connections.find((connection) => connection.target === cameras[0]?.id)?.medium,
      })
    })

    return {
      nodes: [...nodes.filter((node) => !groupedCameraIds.has(node.id)), ...groupNodes],
      connections: [
        ...connections.filter((connection) => !groupedCameraIds.has(connection.target)),
        ...groupConnections,
      ],
    }
  }, [connections, expandedCameraParents, nodes, viewMode])

  const automaticLayout = useMemo(
    () => computeAutomaticTopologyLayout(presentationGraph.nodes, presentationGraph.connections),
    [presentationGraph],
  )
  const canvasSize = { width: automaticLayout.width, height: automaticLayout.height }
  const displayNodes = presentationGraph.nodes
  const displayConnections = presentationGraph.connections
  const activePositions = viewMode === 'technical' && isEditing ? nodePositions : automaticLayout.positions

  // Fase 2 — links wireless entre roteadores pareados (dedupe: só desenha uma vez por par)
  const wirelessLinks = useMemo(() => {
    const routers = displayNodes.filter((node) => node.type === 'router' && node.paired_router_id)
    const seen = new Set<string>()
    const links: Array<{ id: string; sourceId: string; targetId: string }> = []
    for (const router of routers) {
      const targetId = router.paired_router_id
      if (!targetId) continue
      const key = [router.id, targetId].sort().join('::')
      if (seen.has(key)) continue
      seen.add(key)
      // Só desenha se o par também está entre os nós renderizados
      if (!displayNodes.some((n) => n.id === targetId)) continue
      links.push({ id: `wireless-${key}`, sourceId: router.id, targetId })
    }
    return links
  }, [displayNodes])

  // Fase 2 — clusters de site (bounding box atrás dos nós do mesmo site_id)
  const siteClusters = useMemo(() => {
    if (sites.length === 0) return []
    const PADDING = 26
    const HEADER = 20
    return sites
      .map((site) => {
        const memberNodes = displayNodes.filter((n) => n.site_id === site.id)
        if (memberNodes.length === 0) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const node of memberNodes) {
          const pos = activePositions[node.id]
          if (!pos) continue
          const halfW = TOPOLOGY_NODE_WIDTH / 2
          const halfH = TOPOLOGY_NODE_HEIGHT / 2
          minX = Math.min(minX, pos.x - halfW)
          minY = Math.min(minY, pos.y - halfH)
          maxX = Math.max(maxX, pos.x + halfW)
          maxY = Math.max(maxY, pos.y + halfH)
        }
        if (!isFinite(minX)) return null
        return {
          site,
          x: minX - PADDING,
          y: minY - PADDING - HEADER,
          width: maxX - minX + PADDING * 2,
          height: maxY - minY + PADDING * 2 + HEADER,
        }
      })
      .filter((cluster): cluster is NonNullable<typeof cluster> => cluster !== null)
  }, [sites, displayNodes, activePositions])

  // Carregar dados de nota do cliente e construir topologia
  const loadTopology = useCallback(async () => {
    if (!selectedClientId) return
    setLoading(true)
    try {
      // 1. Carregar notas do cliente
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('notes')
        .eq('id', selectedClientId)
        .single()

      if (clientErr) throw clientErr

      let savedPositions: Record<string, { x: number; y: number }> = {}
      let savedUseManualConnections = false
      let savedManualConnections: TopologyConnection[] = []
      let savedTopologyRacks: TopologyRack[] = []
      let savedSnapToGrid = true

      if (client?.notes) {
        try {
          const parsed = JSON.parse(client.notes)
          if (parsed) {
            setTextNotes(parsed.textNotes || '')
            if (parsed.topologyLayout) {
              savedPositions = parsed.topologyLayout
            }
            savedSnapToGrid = parsed.topologySnapToGrid !== false
            savedUseManualConnections = Boolean(parsed.topologyUseManualConnections)
            savedManualConnections = Array.isArray(parsed.topologyConnections)
              ? parsed.topologyConnections
              : []
            savedTopologyRacks = Array.isArray(parsed.topologyRacks)
              ? parsed.topologyRacks
                  .filter((rack: Partial<TopologyRack>) => rack.id && rack.name)
                  .map((rack: Partial<TopologyRack>) => ({
                    id: String(rack.id),
                    name: String(rack.name),
                    location: rack.location ? String(rack.location) : 'Rack técnico',
                    notes: rack.notes ? String(rack.notes) : undefined,
                    equipmentIds: Array.isArray(rack.equipmentIds) ? rack.equipmentIds.map(String) : [],
                    hasNobreak: Boolean(rack.hasNobreak),
                    powerNotes: rack.powerNotes ? String(rack.powerNotes) : '',
                    cableNotes: rack.cableNotes ? String(rack.cableNotes) : '',
                    mediaPaths: Array.isArray(rack.mediaPaths) ? rack.mediaPaths.map(String) : [],
                  }))
              : []
          }
        } catch {
          setTextNotes(client.notes)
        }
      }

      // 2. Carregar todos os equipamentos
      const [camerasRes, dvrsRes, switchesRes, routersRes, balunsRes, switchPortsRes, balunPortsRes, racksRes, monitorsRes, sitesRes] = await Promise.all([
        supabase.from('cameras').select('id, name, status, ip_address, location, brand, model, connection_type, switch_id, switch_port, dvr_id, channel_number, balun_id, balun_port, site_id').eq('client_id', selectedClientId),
        supabase.from('dvrs').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('switches').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('routers').select('id, name, status, ip_address, location, brand, model, mode, paired_router_id, site_id, powered_by_poe_injector').eq('client_id', selectedClientId),
        supabase.from('power_baluns').select('*').eq('client_id', selectedClientId),
        supabase.from('switch_ports').select('switch_id, port_number, device_type, device_id, device_name, is_active'),
        supabase.from('balun_ports').select('balun_id, port_number, camera_id, is_active'),
        supabase.from('racks').select('*').eq('client_id', selectedClientId).order('name'),
        supabase.from('monitors').select('id, name, status, location, brand, model, rack_id').eq('client_id', selectedClientId).order('name'),
        supabase.from('installation_sites').select('id, name, site_type').eq('client_id', selectedClientId),
      ])

      setSites((sitesRes.data as TopologySite[]) ?? [])

      if (!racksRes.error && racksRes.data?.length) {
        savedTopologyRacks = racksRes.data.map((rack) => ({
          id: rack.topology_id || rack.id,
          databaseId: rack.id,
          name: rack.name,
          location: rack.location || 'Rack técnico',
          notes: rack.notes || undefined,
          equipmentIds: rack.equipment_ids || [],
          hasNobreak: Boolean(rack.has_nobreak),
          powerNotes: rack.power_notes || '',
          cableNotes: rack.cable_notes || '',
          mediaPaths: rack.media_paths || [],
        }))
      } else if (!racksRes.error && savedTopologyRacks.length > 0 && user) {
        const legacyPayload = savedTopologyRacks.map((rack) => ({
          topology_id: rack.id,
          client_id: selectedClientId,
          user_id: user.id,
          name: rack.name,
          location: rack.location || 'Rack técnico',
          equipment_ids: rack.equipmentIds || [],
          has_nobreak: Boolean(rack.hasNobreak),
          power_notes: rack.powerNotes || null,
          cable_notes: rack.cableNotes || null,
          media_paths: rack.mediaPaths || [],
          notes: rack.notes || null,
        }))
        void supabase.from('racks').upsert(legacyPayload, { onConflict: 'client_id,topology_id' })
      }

      const list: TopologyNode[] = [
        {
          id: 'internet',
          name: 'Nuvem Internet',
          type: 'internet',
          status: 'online',
          ip_address: 'WAN IP',
          location: 'Externo'
        }
      ]

      const tempNodesMap: Record<string, TopologyNode> = {}

      // Roteadores
      if (routersRes.data) {
        routersRes.data.forEach((r) => {
          const node: TopologyNode = {
            id: r.id,
            name: r.name,
            type: 'router',
            status: r.status,
            ip_address: r.ip_address,
            location: r.location || 'Central',
            brand: r.brand,
            model: r.model,
            site_id: r.site_id ?? null,
            router_mode: r.mode ?? 'router',
            paired_router_id: r.paired_router_id ?? null,
            powered_by_poe_injector: Boolean(r.powered_by_poe_injector),
          }
          list.push(node)
          tempNodesMap[r.id] = node
        })
      }

      // Switches
      if (switchesRes.data) {
        switchesRes.data.forEach((s) => {
          const node: TopologyNode = {
            id: s.id,
            name: s.name,
            type: 'switch',
            status: s.status,
            ip_address: s.ip_address,
            location: s.location || 'Rack Principal',
            brand: s.brand,
            model: s.model
          }
          list.push(node)
          tempNodesMap[s.id] = node
        })
      }

      const shouldShowLogicalSwitch = (!switchesRes.data || switchesRes.data.length === 0) && (dvrsRes.data?.length ?? 0) > 0
      if (shouldShowLogicalSwitch) {
        const node: TopologyNode = {
          id: 'logical-switch-main',
          name: 'Switch Principal',
          type: 'switch',
          status: 'ativo',
          ip_address: null,
          location: 'Rack Principal'
        }
        list.push(node)
        tempNodesMap[node.id] = node
      }

      // DVRs
      if (dvrsRes.data) {
        dvrsRes.data.forEach((d) => {
          const node: TopologyNode = {
            id: d.id,
            name: d.name,
            type: 'dvr',
            status: d.status,
            ip_address: d.ip_address,
            location: d.location || 'Central de Segurança',
            brand: d.brand,
            model: d.model
          }
          list.push(node)
          tempNodesMap[d.id] = node
        })
      }

      // Câmeras
      if (camerasRes.data) {
        camerasRes.data.forEach((c) => {
          const node: TopologyNode = {
            id: c.id,
            name: c.name,
            type: 'camera',
            status: c.status,
            ip_address: c.ip_address,
            location: c.location || 'Área Externa',
            brand: c.brand,
            model: c.model,
            site_id: c.site_id ?? null,
          }
          list.push(node)
          tempNodesMap[c.id] = node
        })
      }

      if (balunsRes.data) {
        balunsRes.data.forEach((balun: {
          id: string
          name: string
          status?: string | null
          location?: string | null
          balun_type?: string | null
          total_ports?: number | null
        }) => {
          const node: TopologyNode = {
            id: balun.id,
            name: balun.name,
            type: 'balun',
            status: balun.status || 'ativo',
            ip_address: null,
            location: balun.location || 'Rack técnico',
            brand: balun.balun_type === 'power' ? 'Power Balun' : 'Balun',
            model: `${balun.total_ports ?? 0} porta(s)`,
          }
          list.push(node)
          tempNodesMap[balun.id] = node
        })
      }

      if (monitorsRes.data) {
        monitorsRes.data.forEach((monitor) => {
          const node: TopologyNode = {
            id: monitor.id,
            name: monitor.name,
            type: 'monitor',
            status: monitor.status || 'ativo',
            ip_address: null,
            location: monitor.location || 'Central de monitoramento',
            brand: monitor.brand,
            model: monitor.model,
          }
          list.push(node)
          tempNodesMap[monitor.id] = node
        })
      }

      savedTopologyRacks.forEach((rack) => {
        const node: TopologyNode = {
          id: rack.id,
          name: rack.name,
          type: 'rack',
          status: 'ativo',
          ip_address: null,
          location: rack.location || 'Rack técnico',
          brand: 'Rack',
          model: [
            (rack.equipmentIds?.length ?? 0) > 0 ? `${rack.equipmentIds?.length} item(ns)` : null,
            rack.hasNobreak ? 'com nobreak' : 'sem nobreak',
          ].filter(Boolean).join(' · ') || rack.notes || null,
        }
        list.push(node)
        tempNodesMap[node.id] = node
      })

      setTopologyRacks(savedTopologyRacks)
      setSnapToGrid(savedSnapToGrid)
      setNodes(list)

      // 3. Mapear conexões lógicas e físicas
      const conns: TopologyConnection[] = buildAutomaticTopologyConnections({
        nodes: list,
        cameras: camerasRes.data ?? [],
        switchPorts: ((switchPortsRes.data ?? []) as SwitchPortTopologyRow[]).map((port) => ({
          switch_id: port.switch_id,
          port_number: port.port_number,
          device_id: port.device_id,
          is_active: port.is_active,
        })),
        balunPorts: (balunPortsRes.data ?? []).map((port) => ({
          balun_id: port.balun_id,
          port_number: port.port_number,
          camera_id: port.camera_id,
          is_active: port.is_active,
        })),
      })

      const validNodeIds = new Set(list.map((node) => node.id))
      const manual = savedManualConnections
        .filter((conn) => validNodeIds.has(conn.source) && validNodeIds.has(conn.target) && conn.source !== conn.target)
        .map((conn) => {
          const targetNode = list.find((node) => node.id === conn.target)
          return {
            ...conn,
            id: conn.id || `manual-${conn.source}-${conn.target}`,
            active: targetNode?.status === 'ativo' || targetNode?.status === 'online',
            style: conn.style ?? 'dashed',
            manual: true
          }
        })

      setAutoConnections(conns)
      setManualConnections(manual)
      setUseManualConnections(savedUseManualConnections)
      setConnections(savedUseManualConnections ? manual : conns)

      // 4. Calcular layout default ou usar o salvo
      const computedLayout = computeLayout(list, savedPositions, { connections: savedUseManualConnections ? manual : conns })
      setNodePositions(computedLayout)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : String(err)
      toast('Erro ao processar topologia: ' + message, 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedClientId, user, toast])

  // Distribui os nós em camadas automáticas
  const computeLayout = (
    allNodes: TopologyNode[],
    saved: Record<string, { x: number; y: number }>,
    context?: TopologyBuildContext
  ) => {
    const automatic = computeAutomaticTopologyLayout(allNodes, context?.connections ?? [])
    return Object.fromEntries(allNodes.map((node) => [
      node.id,
      saved[node.id] ?? automatic.positions[node.id],
    ]))
  }

  useEffect(() => {
    loadTopology()
  }, [loadTopology])

  // Salvar layout de topologia no Supabase
  const handleSaveTopology = async (updatedPositions = nodePositions) => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const { data: currentClient, error: currentClientError } = await supabase
        .from('clients')
        .select('notes')
        .eq('id', selectedClientId)
        .single()

      if (currentClientError) throw currentClientError

      let existingNotes: Record<string, unknown> = {}
      if (currentClient?.notes) {
        try {
          const parsed = JSON.parse(currentClient.notes)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            existingNotes = parsed
          } else {
            existingNotes = { textNotes: currentClient.notes }
          }
        } catch {
          existingNotes = { textNotes: currentClient.notes }
        }
      }

      const notesPayload = JSON.stringify({
        ...existingNotes,
        textNotes,
        topologyLayout: updatedPositions,
        topologySnapToGrid: snapToGrid,
        topologyUseManualConnections: useManualConnections,
        topologyRacks,
        topologyConnections: manualConnections.map((conn) => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          active: conn.active,
          label: conn.label,
          style: conn.style ?? 'dashed',
          manual: true
        }))
      })

      const { error } = await supabase
        .from('clients')
        .update({ notes: notesPayload })
        .eq('id', selectedClientId)

      if (error) throw error

      if (user) {
        const rackPayload = topologyRacks.map((rack) => ({
          topology_id: rack.id,
          client_id: selectedClientId,
          user_id: user.id,
          name: rack.name,
          location: rack.location || 'Rack técnico',
          equipment_ids: rack.equipmentIds || [],
          has_nobreak: Boolean(rack.hasNobreak),
          power_notes: rack.powerNotes || null,
          cable_notes: rack.cableNotes || null,
          media_paths: rack.mediaPaths || [],
          notes: rack.notes || null,
        }))
        if (rackPayload.length > 0) {
          const rackResult = await supabase.from('racks').upsert(rackPayload, { onConflict: 'client_id,topology_id' })
          if (rackResult.error) throw rackResult.error
        }
      }

      toast('Topologia de rede salva com sucesso!')
      setIsEditing(false)
    } catch (err: any) {
      console.error(err)
      toast('Erro ao salvar topologia: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Redefinir para o layout padrão em árvore
  const handleResetLayout = () => {
    const defaultConnections = connections.length > 0 ? connections : manualConnections
    const defaultLayout = computeLayout(nodes, {}, { connections: defaultConnections })
    setNodePositions(defaultLayout)
    toast('Layout redefinido. Clique em Salvar Topologia para gravar.')
  }

  const refreshConnectionActivity = (items: TopologyConnection[]) => {
    return items.map((conn) => {
      const targetNode = nodes.find((node) => node.id === conn.target)
      return {
        ...conn,
        active: targetNode?.status === 'ativo' || targetNode?.status === 'online'
      }
    })
  }

  const handleManualModeChange = (enabled: boolean) => {
    setUseManualConnections(enabled)
    setConnections(enabled ? refreshConnectionActivity(manualConnections) : autoConnections)
  }

  const handleAddManualConnection = () => {
    if (!manualSource || !manualTarget || manualSource === manualTarget) {
      toast('Selecione origem e destino diferentes para a conexão.', 'error')
      return
    }

    const targetNode = nodes.find((node) => node.id === manualTarget)
    const nextConnection: TopologyConnection = {
      id: `manual-${manualSource}-${manualTarget}-${Date.now()}`,
      source: manualSource,
      target: manualTarget,
      active: targetNode?.status === 'ativo' || targetNode?.status === 'online',
      label: manualLabel.trim() || undefined,
      style: manualStyle,
      manual: true
    }
    const nextManualConnections = [...manualConnections, nextConnection]
    setManualConnections(nextManualConnections)
    if (useManualConnections) setConnections(nextManualConnections)
    setManualLabel('')
    toast('Conexão manual adicionada. Clique em Salvar Topologia para gravar.')
  }

  const handleRemoveManualConnection = (id: string) => {
    const nextManualConnections = manualConnections.filter((conn) => conn.id !== id)
    setManualConnections(nextManualConnections)
    if (useManualConnections) setConnections(nextManualConnections)
  }

  const handleAddRack = () => {
    const rackName = newRackName.trim()
    if (!rackName) {
      toast('Informe um nome para o rack.', 'error')
      return
    }

    const rack: TopologyRack = {
      id: editingRackId || `rack-${Date.now()}`,
      name: rackName,
      location: newRackLocation.trim() || 'Rack técnico',
      equipmentIds: newRackEquipmentIds,
      hasNobreak: newRackHasNobreak,
      powerNotes: newRackPowerNotes.trim(),
      cableNotes: newRackCableNotes.trim(),
      mediaPaths: newRackMediaPaths,
    }
    const rackNode: TopologyNode = {
      id: rack.id,
      name: rack.name,
      type: 'rack',
      status: 'ativo',
      ip_address: null,
      location: rack.location,
      brand: 'Rack',
      model: [
        newRackEquipmentIds.length > 0 ? `${newRackEquipmentIds.length} item(ns)` : null,
        newRackHasNobreak ? 'com nobreak' : 'sem nobreak',
      ].filter(Boolean).join(' · '),
    }

    if (editingRackId) {
      setTopologyRacks((current) => current.map((item) => item.id === editingRackId ? rack : item))
      setNodes((current) => current.map((node) => node.id === editingRackId ? rackNode : node))
      setSelectedNode((current) => current?.id === editingRackId ? rackNode : current)
      setEditingRackId('')
      setNewRackName('')
      setNewRackLocation('')
      setNewRackEquipmentIds([])
      setNewRackHasNobreak(false)
      setNewRackPowerNotes('')
      setNewRackCableNotes('')
      setNewRackMediaPaths([])
      toast('Rack atualizado. Clique em Salvar Topologia para gravar.')
      return
    }

    setTopologyRacks((current) => [...current, rack])
    setNodes((current) => [...current, rackNode])
    setNodePositions((current) => ({
      ...current,
      [rack.id]: { x: canvasSize.width / 2, y: 360 + Math.min(topologyRacks.length, 2) * 90 },
    }))
    setNewRackName('')
    setNewRackLocation('')
    setNewRackEquipmentIds([])
    setNewRackHasNobreak(false)
    setNewRackPowerNotes('')
    setNewRackCableNotes('')
    setNewRackMediaPaths([])
    toast('Rack adicionado. Crie conexões manuais e clique em Salvar Topologia para gravar.')
  }

  const handleEditRack = (rack: TopologyRack) => {
    setEditingRackId(rack.id)
    setNewRackName(rack.name)
    setNewRackLocation(rack.location)
    setNewRackEquipmentIds(rack.equipmentIds ?? [])
    setNewRackHasNobreak(Boolean(rack.hasNobreak))
    setNewRackPowerNotes(rack.powerNotes ?? '')
    setNewRackCableNotes(rack.cableNotes ?? '')
    setNewRackMediaPaths(rack.mediaPaths ?? [])
  }

  const handleRemoveRack = (rackId: string) => {
    setTopologyRacks((current) => current.filter((rack) => rack.id !== rackId))
    setNodes((current) => current.filter((node) => node.id !== rackId))
    setSelectedNode((current) => current?.id === rackId ? null : current)
    setSelectedNodeIds((current) => current.filter((id) => id !== rackId))
    setNodePositions((current) => {
      const next = { ...current }
      delete next[rackId]
      return next
    })
    const nextManualConnections = manualConnections.filter((conn) => conn.source !== rackId && conn.target !== rackId)
    setManualConnections(nextManualConnections)
    if (useManualConnections) setConnections(nextManualConnections)
    toast('Rack removido. Clique em Salvar Topologia para gravar.')
  }

  const clampTopologyPosition = (position: { x: number; y: number }) => ({
    x: Math.max(TOPOLOGY_CANVAS_MARGIN, Math.min(canvasSize.width - TOPOLOGY_CANVAS_MARGIN, position.x)),
    y: Math.max(TOPOLOGY_CANVAS_MARGIN, Math.min(canvasSize.height - TOPOLOGY_CANVAS_MARGIN, position.y)),
  })

  const snapTopologyPosition = (position: { x: number; y: number }) => {
    const clamped = clampTopologyPosition(position)
    if (!snapToGrid) return clamped
    return clampTopologyPosition({
      x: Math.round(clamped.x / TOPOLOGY_GRID_SIZE) * TOPOLOGY_GRID_SIZE,
      y: Math.round(clamped.y / TOPOLOGY_GRID_SIZE) * TOPOLOGY_GRID_SIZE,
    })
  }

  const getSelectedMovableNodeIds = () => {
    const ids = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNode ? [selectedNode.id] : []
    return ids.filter((id) => nodes.some((node) => node.id === id && node.type !== 'internet') && nodePositions[id])
  }

  const handleNodeClick = (node: TopologyNode, event: React.MouseEvent<HTMLDivElement>) => {
    setSelectedNode(node)
    if (!isEditing || node.type === 'internet') return

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelectedNodeIds((current) => (
        current.includes(node.id)
          ? current.filter((id) => id !== node.id)
          : [...current, node.id]
      ))
      return
    }

    setSelectedNodeIds([node.id])
  }

  const alignSelectedNodes = (axis: 'x' | 'y') => {
    const ids = getSelectedMovableNodeIds()
    if (ids.length < 2) {
      toast('Selecione pelo menos 2 blocos no modo Organizar para alinhar.', 'error')
      return
    }

    const reference = Math.round(
      ids.reduce((sum, id) => sum + nodePositions[id][axis], 0) / ids.length
    )

    setNodePositions((current) => {
      const next = { ...current }
      ids.forEach((id) => {
        const currentPos = current[id]
        if (!currentPos) return
        next[id] = snapTopologyPosition(axis === 'x'
          ? { ...currentPos, x: reference }
          : { ...currentPos, y: reference }
        )
      })
      return next
    })
  }

  const distributeSelectedNodes = (axis: 'x' | 'y') => {
    const ids = getSelectedMovableNodeIds()
    if (ids.length < 3) {
      toast('Selecione pelo menos 3 blocos para distribuir com espaçamento igual.', 'error')
      return
    }

    const sorted = [...ids].sort((a, b) => nodePositions[a][axis] - nodePositions[b][axis])
    const first = nodePositions[sorted[0]][axis]
    const last = nodePositions[sorted[sorted.length - 1]][axis]
    const step = (last - first) / (sorted.length - 1)

    setNodePositions((current) => {
      const next = { ...current }
      sorted.forEach((id, index) => {
        const currentPos = current[id]
        if (!currentPos) return
        next[id] = snapTopologyPosition(axis === 'x'
          ? { ...currentPos, x: first + step * index }
          : { ...currentPos, y: first + step * index }
        )
      })
      return next
    })
  }

  const snapAllNodesToGrid = () => {
    setNodePositions((current) => Object.fromEntries(
      Object.entries(current).map(([id, position]) => [id, snapTopologyPosition(position)])
    ))
    toast('Blocos ajustados à grade. Clique em Salvar Topologia para gravar.')
  }

  // Lógica ao soltar o nó após arrastar no Canvas da Topologia
  const handleNodeDragEnd = (id: string, info: any) => {
    const prevPos = nodePositions[id]
    if (!prevPos) return

    // Calcula a distância do movimento em pixels físicos da tela
    const distance = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y)
    
    // Se foi apenas um clique ou tremor leve (menos de 5px), não atualiza nada
    if (distance < 5) return

    // Calcula o deslocamento lógico compensando a escala do zoom do canvas
    const deltaX = info.offset.x / zoom
    const deltaY = info.offset.y / zoom

    // Nova posição baseada na posição anterior + deslocamento lógico
    const x = prevPos.x + deltaX
    const y = prevPos.y + deltaY

    const snapped = snapTopologyPosition({ x, y })

    const newPositions = {
      ...nodePositions,
      [id]: snapped
    }
    setNodePositions(newPositions)
  }

  // Obter detalhes de conexão por nó
  const getNodeColorClass = (status: string, type: string) => {
    if (type === 'internet') {
      return 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-blue-500/25'
    }
    
    switch (status) {
      case 'ativo':
      case 'online':
        return 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
      case 'manutencao':
      case 'warning':
        return 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-amber-500/20'
      case 'inativo':
      case 'offline':
      default:
        return 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-rose-500/20'
    }
  }

  const getNodeIcon = (type: string, className = 'w-5 h-5') => {
    switch (type) {
      case 'internet':
        return <Globe className={className} />
      case 'router':
        return <Wifi className={className} />
      case 'switch':
        return <Network className={className} />
      case 'rack':
        return <Package className={className} />
      case 'balun':
        return <Cable className={className} />
      case 'monitor':
        return <Monitor className={className} />
      case 'dvr':
        return <Server className={className} />
      case 'camera-group':
        return <Layers3 className={className} />
      case 'camera':
      default:
        return <Video className={className} />
    }
  }

  const getNodeTypeLabel = (type: TopologyNode['type']) => {
    const labels: Record<TopologyNode['type'], string> = {
      internet: 'Internet',
      router: 'Roteador',
      switch: 'Switch',
      dvr: 'DVR',
      camera: 'Câmera',
      'camera-group': 'Grupo de câmeras',
      rack: 'Rack',
      balun: 'Power Balun',
      monitor: 'Monitor'
    }
    return labels[type]
  }

  const getRackEquipmentNodes = (rack: TopologyRack) => {
    const ids = new Set(rack.equipmentIds ?? [])
    return nodes.filter((node) => ids.has(node.id))
  }

  const toggleRackEquipment = (equipmentId: string) => {
    setNewRackEquipmentIds((current) => (
      current.includes(equipmentId)
        ? current.filter((id) => id !== equipmentId)
        : [...current, equipmentId]
    ))
  }

  const isVideoMedia = (path: string) => /\.(mp4|webm|mov|m4v)$/i.test(path.split('?')[0] || path)

  useEffect(() => {
    const mediaPaths = Array.from(new Set([
      ...newRackMediaPaths,
      ...topologyRacks.flatMap((rack) => rack.mediaPaths ?? []),
    ]))
    if (mediaPaths.length === 0) {
      setRackMediaPreviews({})
      return
    }

    let cancelled = false
    async function loadRackMediaPreviews() {
      const entries = await Promise.all(
        mediaPaths.map(async (path) => [path, await getInstallationPhotoUrl(path)] as const),
      )
      if (!cancelled) setRackMediaPreviews(Object.fromEntries(entries))
    }

    loadRackMediaPreviews()
    return () => {
      cancelled = true
    }
  }, [newRackMediaPaths, topologyRacks])

  const handleRackMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    if (!user) {
      toast('Faça login para anexar mídias ao rack.', 'error')
      event.target.value = ''
      return
    }

    setUploadingRackMedia(true)
    const uploadedPaths: string[] = []

    for (const file of files) {
      const result = await uploadInstallationPhoto(file, user.id, editingRackId || `rack-${Date.now()}`)
      if (result.error) {
        toast('Erro ao anexar mídia do rack: ' + result.error, 'error')
        break
      }
      if (result.url) uploadedPaths.push(result.url)
    }

    if (uploadedPaths.length > 0) {
      setNewRackMediaPaths((current) => [...current, ...uploadedPaths])
    }

    setUploadingRackMedia(false)
    event.target.value = ''
  }

  const handleRemoveRackMedia = async (mediaPath: string) => {
    await deleteInstallationPhoto(mediaPath)
    setNewRackMediaPaths((current) => current.filter((path) => path !== mediaPath))
    setTopologyRacks((current) => current.map((rack) => (
      rack.id === editingRackId
        ? { ...rack, mediaPaths: (rack.mediaPaths ?? []).filter((path) => path !== mediaPath) }
        : rack
    )))
  }

  if (!selectedClientId) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border-light p-8 text-center max-w-lg mx-auto mt-12">
        <Network className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">Nenhum cliente selecionado</h3>
        <p className="text-text-muted text-sm mb-4">
          Por favor, selecione um cliente no menu superior para visualizar o mapeamento de topologia de rede.
        </p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  const isDedicatedTopologyPage = location.pathname === '/topologia'
  const shellClass = isFullscreen
    ? 'fixed inset-0 z-[80] bg-bg-primary p-3 sm:p-5 overflow-auto space-y-4'
    : 'space-y-6'
  const canvasViewportClass = isFullscreen
    ? 'h-[calc(100vh-150px)] min-h-[560px]'
    : 'h-[72vh] min-h-[560px] xl:h-[760px]'
  const viewportWidth = canvasSize.width * zoom
  const viewportHeight = canvasSize.height * zoom
  const rackEquipmentOptions = nodes.filter((node) => node.type !== 'internet' && node.type !== 'rack')
  const selectedRack = selectedNode?.type === 'rack'
    ? topologyRacks.find((rack) => rack.id === selectedNode.id)
    : null
  const selectedRackEquipment = selectedRack ? getRackEquipmentNodes(selectedRack) : []
  const selectedRackConnections = selectedRack
    ? connections.filter((connection) => connection.source === selectedRack.id || connection.target === selectedRack.id)
    : []
  const unlinkedCount = automaticLayout.orphanIds.filter(
    (id) => displayNodes.find((node) => node.id === id)?.type !== 'rack',
  ).length

  return (
    <div className={shellClass}>
      <header className={`flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-secondary p-5 rounded-xl border border-border-light ${isFullscreen ? 'sticky top-0 z-30 shadow-xl' : ''}`}>
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Network className="w-5 h-5 text-accent animate-pulse" />
            Topologia de Rede Física
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Mapeamento dinâmico de equipamentos de rede e CFTV do cliente <span className="text-accent font-semibold">{selectedClientName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border-light bg-bg-primary p-1" aria-label="Modo de visualização">
            <button
              type="button"
              onClick={() => {
                setViewMode('presentation')
                setIsEditing(false)
                setSelectedNode(null)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'presentation' ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Apresentação
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('technical')
                setSelectedNode(null)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'technical' ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Técnico
            </button>
          </div>
          {!isDedicatedTopologyPage && (
            <Button
              variant="secondary"
              onClick={() => navigate('/topologia')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Tela
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setIsFullscreen((value) => !value)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          </Button>

          <Button
            onClick={() => handleSaveTopology()}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Salvando...' : 'Salvar Topologia'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleResetLayout}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Redefinir Árvore
          </Button>

          {viewMode === 'technical' && <button
            onClick={() => {
              if (isEditing) {
                handleSaveTopology()
              } else {
                setIsEditing(true)
                setSelectedNodeIds(selectedNode?.type !== 'internet' && selectedNode ? [selectedNode.id] : [])
              }
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${
              isEditing
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-bg-primary hover:bg-bg-tertiary border-border-light text-text-primary'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? 'Finalizar Organização' : 'Organizar Blocos'}
          </button>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo da topologia">
        <div className="rounded-xl border border-border-light bg-bg-secondary px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Equipamentos exibidos</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{displayNodes.length}</p>
        </div>
        <div className="rounded-xl border border-border-light bg-bg-secondary px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Vínculos identificados</p>
          <p className="mt-1 font-mono text-xl font-bold text-cyan-300">{displayConnections.length}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${
          unlinkedCount > 0
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-emerald-500/20 bg-emerald-500/5'
        }`}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <AlertTriangle className="h-3.5 w-3.5" />
            Sem vínculo cadastrado
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-amber-300">
            {unlinkedCount}
          </p>
        </div>
      </section>

      <div className={`grid grid-cols-1 2xl:grid-cols-[300px_minmax(0,1fr)] gap-4 ${isFullscreen ? 'items-start' : ''}`}>
        {/* Painel de Zoom & Detalhamento */}
        <div className="2xl:order-1 order-2 flex flex-col gap-3 min-w-0 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-2rem)] 2xl:overflow-y-auto 2xl:pr-1">
          {/* Zoom controls */}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-3">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Controle do Mapa</h3>
            <div className="flex items-center justify-between bg-bg-primary rounded-lg border border-border-light p-1">
              <button
                onClick={() => setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 1.6))}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold text-text-muted">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.45))}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(0.8)}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Zoom 100%"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-border-light bg-bg-primary p-2">
              <label className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                <span>Encaixar na grade</span>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.target.checked)}
                  className="accent-cyan-500"
                />
              </label>
              <p className="mt-1 text-[10px] text-text-muted">
                No modo Organizar, use Shift/Ctrl para selecionar vários blocos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => alignSelectedNodes('x')}
                disabled={!isEditing}
                className="rounded-lg border border-border-light bg-bg-primary px-2 py-2 text-[10px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title="Alinhar selecionados na mesma coluna"
              >
                Alinhar vertical
              </button>
              <button
                type="button"
                onClick={() => alignSelectedNodes('y')}
                disabled={!isEditing}
                className="rounded-lg border border-border-light bg-bg-primary px-2 py-2 text-[10px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title="Alinhar selecionados na mesma linha"
              >
                Alinhar horizontal
              </button>
              <button
                type="button"
                onClick={() => distributeSelectedNodes('x')}
                disabled={!isEditing}
                className="rounded-lg border border-border-light bg-bg-primary px-2 py-2 text-[10px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title="Distribuir selecionados com espaçamento horizontal igual"
              >
                Distribuir X
              </button>
              <button
                type="button"
                onClick={() => distributeSelectedNodes('y')}
                disabled={!isEditing}
                className="rounded-lg border border-border-light bg-bg-primary px-2 py-2 text-[10px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title="Distribuir selecionados com espaçamento vertical igual"
              >
                Distribuir Y
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={snapAllNodesToGrid}
                disabled={!isEditing}
                className="flex-1 justify-center"
              >
                Ajustar à grade
              </Button>
              <button
                type="button"
                onClick={() => setSelectedNodeIds([])}
                className="rounded-lg border border-border-light px-3 py-2 text-[10px] text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                Limpar
              </button>
            </div>

            {isEditing && selectedNodeIds.length > 0 && (
              <p className="text-[10px] font-mono text-accent">
                {selectedNodeIds.length} bloco(s) selecionado(s)
              </p>
            )}
          </div>

          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-3">
            <div>
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                Racks / Quadros
              </h3>
              <p className="text-[10px] text-text-muted mt-1">
                Documente o ponto técnico com os equipamentos, alimentação e cabos que chegam nele.
              </p>
            </div>

            <div className="space-y-2">
              <input
                value={newRackName}
                onChange={(event) => setNewRackName(event.target.value)}
                placeholder="Nome: Rack Portaria"
                className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <input
                value={newRackLocation}
                onChange={(event) => setNewRackLocation(event.target.value)}
                placeholder="Local: Guarita / Bloco B"
                className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />

              <div className="rounded-lg border border-border-light bg-bg-primary/60 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Equipamentos internos
                  </span>
                  <span className="font-mono text-[10px] text-accent">
                    {newRackEquipmentIds.length} selecionado(s)
                  </span>
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {rackEquipmentOptions.length === 0 ? (
                    <p className="px-2 py-2 text-[10px] text-text-muted">
                      Cadastre switch, DVR, roteador ou Power Balun para vincular ao rack.
                    </p>
                  ) : (
                    rackEquipmentOptions.map((node) => (
                      <label
                        key={`rack-equipment-${node.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[10px] text-text-secondary hover:bg-bg-tertiary"
                      >
                        <input
                          type="checkbox"
                          checked={newRackEquipmentIds.includes(node.id)}
                          onChange={() => toggleRackEquipment(node.id)}
                          className="accent-cyan-500"
                        />
                        <span className="min-w-14 text-text-muted">{getNodeTypeLabel(node.type)}</span>
                        <span className="min-w-0 flex-1 truncate text-text-primary">{node.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-xs text-text-secondary">
                <span>Nobreak instalado neste rack/quadro</span>
                <input
                  type="checkbox"
                  checked={newRackHasNobreak}
                  onChange={(event) => setNewRackHasNobreak(event.target.checked)}
                  className="accent-cyan-500"
                />
              </label>

              <textarea
                value={newRackPowerNotes}
                onChange={(event) => setNewRackPowerNotes(event.target.value)}
                placeholder="Alimentação/fontes: fonte 12V 10A, régua, circuito, disjuntor..."
                rows={2}
                className="w-full resize-none px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />

              <textarea
                value={newRackCableNotes}
                onChange={(event) => setNewRackCableNotes(event.target.value)}
                placeholder="Cabos/interligações: fibra, UTP, coaxial, saída para DVR, link para switch..."
                rows={2}
                className="w-full resize-none px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />

              <div className="rounded-lg border border-border-light bg-bg-primary/60 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Fotos / vídeos do rack
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-on-accent transition-colors hover:brightness-110">
                    <Upload className="h-3 w-3" />
                    {uploadingRackMedia ? 'Enviando...' : 'Anexar'}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploadingRackMedia}
                      onChange={handleRackMediaUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {newRackMediaPaths.length === 0 ? (
                  <p className="px-2 py-2 text-[10px] text-text-muted">
                    Anexe fotos do interior do rack, fontes, nobreak e organização dos cabos.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {newRackMediaPaths.map((path) => {
                      const previewUrl = rackMediaPreviews[path]
                      return (
                        <div key={`rack-media-form-${path}`} className="relative overflow-hidden rounded-lg border border-border-light bg-bg-secondary">
                          {previewUrl ? (
                            isVideoMedia(path) ? (
                              <video src={previewUrl} className="aspect-video w-full bg-black object-cover" muted controls preload="metadata" />
                            ) : (
                              <img src={previewUrl} alt="Mídia do rack" className="aspect-video w-full object-cover" />
                            )
                          ) : (
                            <div className="flex aspect-video items-center justify-center text-[10px] text-text-muted">
                              Preparando...
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveRackMedia(path)}
                            className="absolute right-1 top-1 rounded bg-bg-primary/90 p-1 text-text-muted transition-colors hover:text-danger"
                            title="Remover mídia"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleAddRack}
                className="w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingRackId ? 'Atualizar Rack' : 'Adicionar Rack'}
              </Button>
              {editingRackId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRackId('')
                    setNewRackName('')
                    setNewRackLocation('')
                    setNewRackEquipmentIds([])
                    setNewRackHasNobreak(false)
                    setNewRackPowerNotes('')
                    setNewRackCableNotes('')
                    setNewRackMediaPaths([])
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            {topologyRacks.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {topologyRacks.map((rack) => (
                  <div
                    key={rack.id}
                    className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg bg-bg-primary/70 border border-border-light text-[10px]"
                  >
                    <div className="min-w-0">
                      <p className="text-text-primary truncate">{rack.name}</p>
                      <p className="text-text-muted truncate">{rack.location}</p>
                      <p className="mt-0.5 font-mono text-[9px] text-accent">
                        {(rack.equipmentIds?.length ?? 0)} item(ns) · {rack.hasNobreak ? 'com nobreak' : 'sem nobreak'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditRack(rack)}
                        className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                        title="Editar rack"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRack(rack.id)}
                        className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Remover rack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-accent" />
                  Conexões Manuais
                </h3>
                <p className="text-[10px] text-text-muted mt-1">
                  Defina manualmente quais blocos devem se conectar.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={useManualConnections}
                  onChange={(event) => handleManualModeChange(event.target.checked)}
                  className="accent-cyan-500"
                />
                Usar
              </label>
            </div>

            <div className="space-y-2">
              <select
                value={manualSource}
                onChange={(event) => setManualSource(event.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Origem</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {getNodeTypeLabel(node.type)} - {node.name}
                  </option>
                ))}
              </select>

              <select
                value={manualTarget}
                onChange={(event) => setManualTarget(event.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Destino</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {getNodeTypeLabel(node.type)} - {node.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-[1fr_110px] gap-2">
                <input
                  value={manualLabel}
                  onChange={(event) => setManualLabel(event.target.value)}
                  placeholder="Rótulo: LAN, P1..."
                  className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
                <select
                  value={manualStyle}
                  onChange={(event) => setManualStyle(event.target.value as 'dashed' | 'solid')}
                  className="w-full px-2 py-2 bg-bg-primary border border-border-light rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="dashed">Pontilhada</option>
                  <option value="solid">Contínua</option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={handleAddManualConnection}
                className="w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Conexão
              </Button>
            </div>

            {manualConnections.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {manualConnections.map((conn) => {
                  const sourceNode = nodes.find((node) => node.id === conn.source)
                  const targetNode = nodes.find((node) => node.id === conn.target)
                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg bg-bg-primary/70 border border-border-light text-[10px]"
                    >
                      <div className="min-w-0">
                        <p className="text-text-primary truncate">
                          {sourceNode?.name || conn.source} → {targetNode?.name || conn.target}
                        </p>
                        <p className="text-text-muted font-mono">
                          {conn.label || 'sem rótulo'} · {conn.style === 'solid' ? 'contínua' : 'pontilhada'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveManualConnection(conn.id)}
                        className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Remover conexão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card de Detalhamento do Nó selecionado */}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light flex-1 flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Informações do Equipamento
              </h3>
              
              {!selectedNode ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-2 border border-dashed border-border-light rounded-xl h-full">
                  <Info className="w-8 h-8 text-neutral-600 mb-2" />
                  <p className="text-xs text-text-muted">
                    Selecione qualquer nó na topologia para visualizar as credenciais e detalhes da rede.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border-2 shadow-lg ${getNodeColorClass(selectedNode.status, selectedNode.type)}`}>
                      {getNodeIcon(selectedNode.type, 'w-6 h-6')}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">{selectedNode.name}</h4>
                      <span className="text-[10px] text-accent uppercase font-mono tracking-wider font-bold">
                        {selectedNode.type}
                      </span>
                    </div>
                  </div>

                  <hr className="border-border-light" />

                  {selectedRack ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border-light bg-bg-primary px-3 py-2">
                          <span className="block text-[10px] text-text-muted">Equipamentos</span>
                          <span className="mt-1 block font-mono text-sm font-bold text-text-primary">
                            {selectedRackEquipment.length}
                          </span>
                        </div>
                        <div className="rounded-lg border border-border-light bg-bg-primary px-3 py-2">
                          <span className="block text-[10px] text-text-muted">Nobreak</span>
                          <span className={`mt-1 flex items-center gap-1 font-mono text-sm font-bold ${selectedRack.hasNobreak ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {selectedRack.hasNobreak ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {selectedRack.hasNobreak ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          Dentro do rack
                        </p>
                        {selectedRackEquipment.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border-light px-3 py-2 text-[10px] text-text-muted">
                            Nenhum equipamento vinculado. Edite o cadastro do rack para informar switch, Power Balun, fonte, roteador ou DVR.
                          </p>
                        ) : (
                          selectedRackEquipment.map((item) => (
                            <div key={`rack-detail-${item.id}`} className="flex items-center gap-2 rounded-lg border border-border-light bg-bg-primary px-2 py-2">
                              <span className={`rounded-md border p-1.5 ${getNodeColorClass(item.status, item.type)}`}>
                                {getNodeIcon(item.type, 'h-3.5 w-3.5')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-semibold text-text-primary">{item.name}</p>
                                <p className="truncate font-mono text-[9px] text-text-muted">
                                  {getNodeTypeLabel(item.type)} · {item.ip_address || 'sem IP'}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2 text-[10px]">
                        <div className="rounded-lg border border-border-light bg-bg-primary px-3 py-2">
                          <span className="block font-semibold text-text-muted">Alimentação / fontes</span>
                          <p className="mt-1 text-text-secondary">{selectedRack.powerNotes || 'Não informado'}</p>
                        </div>
                        <div className="rounded-lg border border-border-light bg-bg-primary px-3 py-2">
                          <span className="block font-semibold text-text-muted">Cabos / interligações</span>
                          <p className="mt-1 text-text-secondary">{selectedRack.cableNotes || 'Não informado'}</p>
                        </div>
                        <div className="rounded-lg border border-border-light bg-bg-primary px-3 py-2">
                          <span className="block font-semibold text-text-muted">Conexões no mapa</span>
                          <p className="mt-1 text-text-secondary">
                            {selectedRackConnections.length > 0
                              ? `${selectedRackConnections.length} conexão(ões) manual(is) vinculada(s).`
                              : 'Nenhuma conexão manual vinculada a este rack.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          Fotos / vídeos
                        </p>
                        {(selectedRack.mediaPaths ?? []).length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border-light px-3 py-2 text-[10px] text-text-muted">
                            Nenhuma mídia anexada ao rack.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {(selectedRack.mediaPaths ?? []).map((path) => {
                              const previewUrl = rackMediaPreviews[path]
                              return (
                                <div key={`rack-media-detail-${path}`} className="overflow-hidden rounded-lg border border-border-light bg-bg-primary">
                                  {previewUrl ? (
                                    isVideoMedia(path) ? (
                                      <video src={previewUrl} className="aspect-video w-full bg-black object-cover" controls preload="metadata" />
                                    ) : (
                                      <img src={previewUrl} alt={`Mídia do rack ${selectedRack.name}`} className="aspect-video w-full object-cover" />
                                    )
                                  ) : (
                                    <div className="flex aspect-video items-center justify-center text-[10px] text-text-muted">
                                      Preparando mídia...
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between py-1 border-b border-border-light/40">
                        <span className="text-text-muted">Endereço IP:</span>
                        <span className="text-text-primary font-bold">{selectedNode.ip_address || 'Não configurado'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-light/40">
                        <span className="text-text-muted">Status:</span>
                        <span className={`font-bold flex items-center gap-1 ${
                          selectedNode.status === 'ativo' || selectedNode.status === 'online' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {selectedNode.status === 'ativo' || selectedNode.status === 'online' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {selectedNode.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-light/40">
                        <span className="text-text-muted">Localização:</span>
                        <span className="text-text-primary max-w-[150px] truncate block text-right">
                          {selectedNode.location}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-light/40">
                        <span className="text-text-muted">Modelo/Marca:</span>
                        <span className="text-text-primary truncate block max-w-[150px] text-right">
                          {selectedNode.brand || '-'} {selectedNode.model || ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedNode && (
              <div className="space-y-2 pt-4 border-t border-border-light">
                {selectedRack && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleEditRack(selectedRack)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar inventário do rack
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setSelectedNode(null)}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Canvas do Diagrama de Topologia */}
        <div className={`2xl:order-2 order-1 bg-bg-secondary rounded-xl border border-border-light relative overflow-auto ${canvasViewportClass} min-w-0`}>
          <div className="sticky left-3 top-3 z-30 ml-auto mr-3 mt-3 flex w-fit flex-wrap items-center gap-3 rounded-lg border border-border-light bg-bg-primary/95 px-3 py-2 text-[9px] font-semibold text-text-muted shadow-lg backdrop-blur">
            <span className="font-bold uppercase tracking-wider text-text-secondary">Legenda</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-violet-400" /> WAN</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-sky-400" /> Rede / PoE</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-amber-400" /> Vídeo</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 border-t border-dashed border-slate-400" /> Inativo</span>
          </div>
          {/* Fundo do Canvas Técnico */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle, #fff 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          <div className="relative p-4" style={{ width: viewportWidth + 32, height: viewportHeight + 32 }}>
            <div
              ref={containerRef}
              className="absolute left-4 top-4 origin-top-left shrink-0"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${zoom})`,
                transition: 'transform 0.15s ease-out'
              }}
            >
            {automaticLayout.lanes.map((lane: TopologyLane, index) => (
              <div
                key={lane.id}
                className={`absolute left-5 right-5 rounded-2xl border ${
                  index % 2 === 0 ? 'border-slate-700/45 bg-slate-950/20' : 'border-slate-700/25 bg-slate-900/10'
                }`}
                style={{ top: lane.y, height: lane.height }}
              >
                <span className="absolute left-4 top-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {lane.label}
                </span>
              </div>
            ))}

            {/* Fase 2 — clusters de site (fundo) */}
            {siteClusters.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none z-0" width={canvasSize.width} height={canvasSize.height}>
                {siteClusters.map((cluster) => (
                  <g key={`site-${cluster.site.id}`}>
                    <rect
                      x={cluster.x}
                      y={cluster.y}
                      width={cluster.width}
                      height={cluster.height}
                      rx={14}
                      fill="rgba(139, 92, 246, 0.06)"
                      stroke="rgba(167, 139, 250, 0.35)"
                      strokeWidth={1}
                      strokeDasharray="6 4"
                    />
                    <text
                      x={cluster.x + 12}
                      y={cluster.y + 14}
                      className="fill-purple-300"
                      style={{ font: '600 11px system-ui', letterSpacing: '0.06em' }}
                    >
                      {cluster.site.name.toUpperCase()}
                    </text>
                  </g>
                ))}
              </svg>
            )}

            {/* SVG das Linhas de Conexão */}
            <svg className="absolute inset-0 pointer-events-none z-0" width={canvasSize.width} height={canvasSize.height}>
              <defs>
                <linearGradient id="active-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="inactive-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1f2937" stopOpacity="0.2" />
                </linearGradient>
                <marker id="topology-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#38bdf8" opacity="0.75" />
                </marker>
              </defs>

              {/* Fase 2 — links wireless (AP ↔ Cliente) */}
              {wirelessLinks.map((link) => {
                const sourcePos = activePositions[link.sourceId]
                const targetPos = activePositions[link.targetId]
                if (!sourcePos || !targetPos) return null
                const midX = (sourcePos.x + targetPos.x) / 2
                const midY = (sourcePos.y + targetPos.y) / 2
                return (
                  <g key={link.id}>
                    <line
                      x1={sourcePos.x} y1={sourcePos.y}
                      x2={targetPos.x} y2={targetPos.y}
                      stroke="#a78bfa"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      opacity={0.75}
                    />
                    <foreignObject x={midX - 32} y={midY - 10} width="64" height="20">
                      <div className="bg-purple-500/20 border border-purple-400/40 text-[8px] font-bold text-purple-200 px-1 py-0.5 rounded text-center">
                        📡 wireless
                      </div>
                    </foreignObject>
                  </g>
                )
              })}

              {displayConnections.map((conn) => {
                const sourcePos = activePositions[conn.source]
                const targetPos = activePositions[conn.target]

                if (!sourcePos || !targetPos) return null

                const x1 = sourcePos.x
                const y1 = sourcePos.y
                const x2 = targetPos.x
                const y2 = targetPos.y
                const pathData = buildOrthogonalTopologyPath(sourcePos, targetPos)
                const mediumColor = conn.medium === 'coaxial' || conn.medium === 'utp-video' || conn.medium === 'video'
                  ? '#f59e0b'
                  : conn.medium === 'wan'
                    ? '#a78bfa'
                    : '#38bdf8'

                return (
                  <g key={conn.id}>
                    <path
                      d={pathData}
                      stroke={conn.active ? mediumColor : '#475569'}
                      strokeWidth={conn.active ? 2.5 : 1.5}
                      strokeDasharray={conn.active ? undefined : '6 5'}
                      fill="none"
                      opacity={conn.active ? 0.78 : 0.4}
                      markerEnd="url(#topology-arrow)"
                    />

                    {/* Pequena label opcional com o número da porta */}
                    {conn.label && (
                      <foreignObject
                        x={x2 - 34}
                        y={y2 - 46}
                        width="68"
                        height="20"
                        className="overflow-visible"
                      >
                        <div className="bg-bg-primary/95 border border-border-light text-[7px] font-bold font-mono text-text-muted px-1 py-0.5 rounded text-center shadow-md">
                          {conn.label}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Renderizar Nós (Equipamentos) */}
            {displayNodes.map((node) => {
              const pos = activePositions[node.id]
              if (!pos) return null

              const isActive = selectedNode?.id === node.id
              const isMultiSelected = selectedNodeIds.includes(node.id)
              const nodeStyle = getNodeColorClass(node.status, node.type)
              const statusColor = node.status === 'ativo' || node.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
              const rack = node.type === 'rack' ? topologyRacks.find((item) => item.id === node.id) : null
              const rackSummary = rack
                ? `${rack.equipmentIds?.length ?? 0} item(ns)${rack.hasNobreak ? ' · nobreak' : ''}`
                : null

              return (
                <motion.div
                  key={node.id}
                  drag={viewMode === 'technical' && isEditing && node.type !== 'internet'}
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(e, info) => handleNodeDragEnd(node.id, info)}
                  onClick={(event) => {
                    if (node.type === 'camera-group') {
                      const parentId = node.id.replace('camera-group-', '')
                      setExpandedCameraParents((current) => [...current, parentId])
                      return
                    }
                    handleNodeClick(node, event)
                  }}
                  className={`absolute z-10 p-3 bg-bg-secondary border-2 rounded-xl flex items-center gap-3 shadow-2xl cursor-pointer select-none transition-colors ${
                    isActive || isMultiSelected ? 'ring-2 ring-accent scale-105 border-accent' : 'border-border-light hover:border-accent/40'
                  }`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    x: '-50%',
                    y: '-50%',
                    width: node.type === 'internet' ? 190 : TOPOLOGY_NODE_WIDTH,
                    minHeight: TOPOLOGY_NODE_HEIGHT
                  }}
                  whileHover={{ scale: isEditing ? 1.02 : 1.05 }}
                >
                  <div className={`p-2 rounded-lg border ${nodeStyle}`}>
                    {getNodeIcon(node.type, 'w-5 h-5')}
                  </div>
                  
                  <div className="overflow-hidden flex-1 leading-tight">
                    <p className="text-[10px] font-bold text-text-primary truncate uppercase">
                      {node.name}
                    </p>
                    <p className="text-[8px] font-mono text-text-muted mt-0.5 truncate">
                      {rackSummary || node.ip_address || 'Sem IP'}
                    </p>
                  </div>

                  {/* Pequena bolinha de status */}
                  {node.type !== 'internet' && (
                    <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${statusColor}`} />
                  )}
                  {node.type === 'camera-group' && (
                    <ChevronDown className="absolute bottom-1.5 right-2 h-3 w-3 text-cyan-300" />
                  )}
                </motion.div>
              )
            })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          stroke-dasharray: 6 4;
          animation: dash 1.2s linear infinite;
        }
      `}</style>
    </div>
  )
}
