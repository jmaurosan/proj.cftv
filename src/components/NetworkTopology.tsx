import React, { useRef, useState, useEffect } from 'react'
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
  Edit2,
  RefreshCw,
  Info,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import { useToast } from './ui/Toast'
import Button from './ui/Button'
import LoadingSpinner from './ui/LoadingSpinner'

interface TopologyNode {
  id: string
  name: string
  type: 'internet' | 'router' | 'switch' | 'dvr' | 'camera'
  status: string
  ip_address: string | null
  location: string
  brand?: string | null
  model?: string | null
}

interface TopologyConnection {
  id: string
  source: string
  target: string
  active: boolean
  label?: string
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

export default function NetworkTopology() {
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()

  const containerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [zoom, setZoom] = useState(0.95)

  // Layout persistido no campo `notes` do cliente
  const [textNotes, setTextNotes] = useState('')
  const [floorPlanConfig, setFloorPlanConfig] = useState<any>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})

  // Nós e conexões
  const [nodes, setNodes] = useState<TopologyNode[]>([])
  const [connections, setConnections] = useState<TopologyConnection[]>([])
  
  // Equipamento selecionado para detalhamento
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null)

  // Carregar dados de nota do cliente e construir topologia
  const loadTopology = async () => {
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

      if (client?.notes) {
        try {
          const parsed = JSON.parse(client.notes)
          if (parsed) {
            setTextNotes(parsed.textNotes || '')
            setFloorPlanConfig(parsed.floorPlan || null)
            if (parsed.topologyLayout) {
              savedPositions = parsed.topologyLayout
            }
          }
        } catch {
          setTextNotes(client.notes)
        }
      }

      // 2. Carregar todos os equipamentos
      const [camerasRes, dvrsRes, switchesRes, routersRes, switchPortsRes] = await Promise.all([
        supabase.from('cameras').select('id, name, status, ip_address, location, brand, model, switch_id, switch_port, dvr_id, channel_number').eq('client_id', selectedClientId),
        supabase.from('dvrs').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('switches').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('routers').select('id, name, status, ip_address, location, brand, model').eq('client_id', selectedClientId),
        supabase.from('switch_ports').select('switch_id, port_number, device_type, device_id, device_name, is_active')
      ])

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
            model: r.model
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
            model: c.model
          }
          list.push(node)
          tempNodesMap[c.id] = node
        })
      }

      setNodes(list)

      // 3. Mapear conexões lógicas e físicas
      const conns: TopologyConnection[] = []
      const connectedTargets = new Set<string>()
      const connectionKeys = new Set<string>()
      const addConnection = (connection: TopologyConnection) => {
        const key = `${connection.source}:${connection.target}:${connection.label ?? ''}`
        if (connectionKeys.has(key)) return
        connectionKeys.add(key)
        connectedTargets.add(connection.target)
        conns.push(connection)
      }

      // Primeiro conectamos os roteadores à Internet
      const routers = list.filter((n) => n.type === 'router')
      routers.forEach((r) => {
        addConnection({
          id: `conn-internet-router-${r.id}`,
          source: 'internet',
          target: r.id,
          active: r.status === 'ativo' || r.status === 'online',
          label: 'Fibra / Link'
        })
      })

      // Se não houver roteador, liga switches diretamente à internet
      if (routers.length === 0) {
        const switches = list.filter((n) => n.type === 'switch')
        switches.forEach((s) => {
          addConnection({
            id: `conn-internet-switch-${s.id}`,
            source: 'internet',
            target: s.id,
            active: s.status === 'ativo' || s.status === 'online'
          })
        })
      }

      const switches = list.filter((n) => n.type === 'switch')
      const nodeById = new Map(list.map((node) => [node.id, node]))
      const switchIds = new Set(switches.map((node) => node.id))
      const switchPortRows = (switchPortsRes.data ?? []) as SwitchPortTopologyRow[]

      switchPortRows
        .filter((port) => port.is_active && switchIds.has(port.switch_id) && port.device_id && nodeById.has(port.device_id))
        .forEach((port) => {
          const targetNode = nodeById.get(port.device_id!)
          if (!targetNode) return

          const source = targetNode.type === 'router' ? targetNode.id : port.switch_id
          const target = targetNode.type === 'router' ? port.switch_id : targetNode.id

          addConnection({
            id: `conn-switch-port-${port.switch_id}-${port.port_number}-${targetNode.id}`,
            source,
            target,
            active: targetNode.status === 'ativo' || targetNode.status === 'online',
            label: `P${port.port_number}`
          })
        })

      // Conectar switches aos roteadores quando não houver porta física mapeada
      switches.forEach((sw) => {
        if (connectedTargets.has(sw.id)) return
        const connectedRouter = routers[0] // fallback de gateway padrão
        if (connectedRouter) {
          addConnection({
            id: `conn-router-switch-${sw.id}`,
            source: connectedRouter.id,
            target: sw.id,
            active: sw.status === 'ativo' || sw.status === 'online',
            label: 'Porta LAN'
          })
        }
      })

      // Conectar DVRs apenas quando houver mapeamento físico ou quando não existir switch cadastrado.
      const dvrs = list.filter((n) => n.type === 'dvr')
      dvrs.forEach((dvr) => {
        if (connectedTargets.has(dvr.id)) return
        const connectedRouter = routers[0]
        if (switches.length === 0 && connectedRouter) {
          addConnection({
            id: `conn-router-dvr-${dvr.id}`,
            source: connectedRouter.id,
            target: dvr.id,
            active: dvr.status === 'ativo' || dvr.status === 'online'
          })
        }
      })

      // Conectar câmeras
      if (camerasRes.data) {
        camerasRes.data.forEach((cam) => {
          if (connectedTargets.has(cam.id)) return
          const isCamActive = cam.status === 'ativo' || cam.status === 'online'
          if (cam.switch_id) {
            // Conecta ao switch correspondente
            addConnection({
              id: `conn-cam-sw-${cam.id}`,
              source: cam.switch_id,
              target: cam.id,
              active: isCamActive,
              label: cam.switch_port ? `P${cam.switch_port}` : 'PoE'
            })
          } else if (cam.dvr_id) {
            // Conecta ao DVR correspondente
            addConnection({
              id: `conn-cam-dvr-${cam.id}`,
              source: cam.dvr_id,
              target: cam.id,
              active: isCamActive,
              label: cam.channel_number ? `CH${cam.channel_number}` : 'Coaxial'
            })
          } else {
            // Se for IP sem switch explícito, liga no primeiro switch ou primeiro roteador
            const connectedSwitch = switches[0]
            const connectedRouter = routers[0]
            if (connectedSwitch) {
              addConnection({
                id: `conn-sw-cam-fallback-${cam.id}`,
                source: connectedSwitch.id,
                target: cam.id,
                active: isCamActive,
                label: 'IP'
              })
            } else if (connectedRouter) {
              addConnection({
                id: `conn-router-cam-fallback-${cam.id}`,
                source: connectedRouter.id,
                target: cam.id,
                active: isCamActive,
                label: 'IP'
              })
            }
          }
        })
      }

      setConnections(conns)

      // 4. Calcular layout default ou usar o salvo
      const computedLayout = computeLayout(list, savedPositions, { connections: conns })
      setNodePositions(computedLayout)
    } catch (err: any) {
      console.error(err)
      toast('Erro ao processar topologia: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Distribui os nós em camadas automáticas
  const computeLayout = (
    allNodes: TopologyNode[],
    saved: Record<string, { x: number; y: number }>,
    context?: TopologyBuildContext
  ) => {
    const layout: Record<string, { x: number; y: number }> = {}

    // Separa por camadas
    const internet = allNodes.filter((n) => n.type === 'internet')
    const routers = allNodes.filter((n) => n.type === 'router')
    const switches = allNodes.filter((n) => n.type === 'switch')
    const dvrs = allNodes.filter((n) => n.type === 'dvr')
    const cameras = allNodes.filter((n) => n.type === 'camera')

    const containerWidth = 980
    const centerX = containerWidth / 2
    const placeNode = (node: TopologyNode, fallback: { x: number; y: number }) => {
      layout[node.id] = saved[node.id] ?? fallback
    }

    internet.forEach((node) => placeNode(node, { x: centerX, y: 45 }))

    routers.forEach((node, index) => {
      const step = containerWidth / (routers.length + 1)
      placeNode(node, { x: routers.length === 1 ? centerX : step * (index + 1), y: 145 })
    })

    const routerBySwitch = new Map<string, string>()
    const dvrConnectionsBySwitch = new Map<string, TopologyConnection[]>()
    const connections = context?.connections ?? []

    connections.forEach((connection) => {
      const sourceNode = allNodes.find((node) => node.id === connection.source)
      const targetNode = allNodes.find((node) => node.id === connection.target)
      if (sourceNode?.type === 'router' && targetNode?.type === 'switch') {
        routerBySwitch.set(targetNode.id, sourceNode.id)
      }
    })

    connections.forEach((connection) => {
      const sourceNode = allNodes.find((node) => node.id === connection.source)
      const targetNode = allNodes.find((node) => node.id === connection.target)
      if (sourceNode?.type === 'switch' && targetNode?.type === 'dvr') {
        const rows = dvrConnectionsBySwitch.get(sourceNode.id) ?? []
        rows.push(connection)
        dvrConnectionsBySwitch.set(sourceNode.id, rows)
      }
    })

    switches.forEach((node, index) => {
      const routerId = routerBySwitch.get(node.id)
      const routerPos = routerId ? layout[routerId] : undefined
      const step = containerWidth / (switches.length + 1)
      placeNode(node, { x: routerPos?.x ?? step * (index + 1), y: 260 })
    })

    const positionedDvrs = new Set<string>()
    switches.forEach((sw) => {
      const switchPos = layout[sw.id]
      const mappedDvrConnections = (dvrConnectionsBySwitch.get(sw.id) ?? [])
        .sort((a, b) => Number(a.label?.replace('P', '') ?? 0) - Number(b.label?.replace('P', '') ?? 0))
      const spread = Math.min(360, Math.max(160, mappedDvrConnections.length * 120))
      mappedDvrConnections.forEach((connection, index) => {
        const dvr = dvrs.find((node) => node.id === connection.target)
        if (!dvr || !switchPos) return
        const offset = mappedDvrConnections.length === 1 ? 0 : -spread / 2 + (spread / (mappedDvrConnections.length - 1)) * index
        placeNode(dvr, { x: Math.max(80, Math.min(970, switchPos.x + offset)), y: 395 })
        positionedDvrs.add(dvr.id)
      })
    })

    dvrs
      .filter((node) => !positionedDvrs.has(node.id))
      .forEach((node, index, unpositioned) => {
        const step = containerWidth / (unpositioned.length + 1)
        placeNode(node, { x: step * (index + 1), y: switches.length > 0 ? 500 : 300 })
      })

    const positionedCameras = new Set<string>()
    cameras.forEach((camera) => {
      const cameraConnection = connections.find((connection) => connection.target === camera.id)
      const parentPos = cameraConnection ? layout[cameraConnection.source] : undefined
      if (!parentPos) return
      const siblings = cameras.filter((cam) => connections.some((connection) => connection.source === cameraConnection!.source && connection.target === cam.id))
      const siblingIndex = siblings.findIndex((cam) => cam.id === camera.id)
      const spread = Math.min(520, Math.max(180, siblings.length * 70))
      const offset = siblings.length <= 1 ? 0 : -spread / 2 + (spread / (siblings.length - 1)) * siblingIndex
      placeNode(camera, { x: Math.max(70, Math.min(980, parentPos.x + offset)), y: Math.min(590, parentPos.y + 115) })
      positionedCameras.add(camera.id)
    })

    cameras
      .filter((node) => !positionedCameras.has(node.id))
      .forEach((node, index, unpositioned) => {
        const step = containerWidth / (unpositioned.length + 1)
        placeNode(node, { x: step * (index + 1), y: 590 })
      })

    return layout
  }

  useEffect(() => {
    loadTopology()
  }, [selectedClientId])

  // Salvar layout de topologia no Supabase
  const handleSaveTopology = async (updatedPositions = nodePositions) => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const notesPayload = JSON.stringify({
        textNotes,
        floorPlan: floorPlanConfig,
        topologyLayout: updatedPositions
      })

      const { error } = await supabase
        .from('clients')
        .update({ notes: notesPayload })
        .eq('id', selectedClientId)

      if (error) throw error

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
    const defaultLayout = computeLayout(nodes, {}, { connections })
    setNodePositions(defaultLayout)
    handleSaveTopology(defaultLayout)
    toast('Layout redefinido para a distribuição automática em árvore.')
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

    // Limites lógicos do canvas técnico (1050x650)
    const constrainedX = Math.max(75, Math.min(975, x))
    const constrainedY = Math.max(45, Math.min(605, y))

    const newPositions = {
      ...nodePositions,
      [id]: { x: constrainedX, y: constrainedY }
    }
    setNodePositions(newPositions)
    handleSaveTopology(newPositions)
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
      case 'dvr':
        return <Server className={className} />
      case 'camera':
      default:
        return <Video className={className} />
    }
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-secondary p-5 rounded-xl border border-border-light">
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
          <Button
            variant="secondary"
            onClick={handleResetLayout}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Redefinir Árvore
          </Button>

          <button
            onClick={() => {
              if (isEditing) {
                handleSaveTopology()
              } else {
                setIsEditing(true)
              }
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${
              isEditing
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-bg-primary hover:bg-bg-tertiary border-border-light text-text-primary'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? 'Salvar Posições' : 'Organizar Blocos'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de Zoom & Detalhamento */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Zoom controls */}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-3">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Controle do Mapa</h3>
            <div className="flex items-center justify-between bg-bg-primary rounded-lg border border-border-light p-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold text-text-muted">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.1, 0.4))}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(0.95)}
                className="p-2 hover:bg-bg-tertiary rounded text-text-primary transition-all"
                title="Zoom 100%"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
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
                </div>
              )}
            </div>

            {selectedNode && (
              <div className="pt-4 border-t border-border-light">
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
        <div className="lg:col-span-3 bg-bg-secondary rounded-xl border border-border-light relative overflow-hidden h-[550px] flex items-center justify-center">
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

          <div
            ref={containerRef}
            className="relative w-[1050px] h-[650px] origin-center shrink-0"
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.15s ease-out'
            }}
          >
            {/* SVG das Linhas de Conexão */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="active-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="inactive-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1f2937" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {connections.map((conn) => {
                const sourcePos = nodePositions[conn.source]
                const targetPos = nodePositions[conn.target]

                if (!sourcePos || !targetPos) return null

                // Ajusta os pontos para saírem do centro das caixas
                const x1 = sourcePos.x
                const y1 = sourcePos.y
                const x2 = targetPos.x
                const y2 = targetPos.y

                // Curva Bézier cúbica vertical para ligar nós em camadas de cima para baixo
                const controlY1 = y1 + (y2 - y1) * 0.4
                const controlY2 = y2 - (y2 - y1) * 0.4
                const pathData = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`

                return (
                  <g key={conn.id}>
                    <path
                      d={pathData}
                      stroke={conn.active ? 'url(#active-grad)' : 'url(#inactive-grad)'}
                      strokeWidth={conn.active ? 2.5 : 1.5}
                      fill="none"
                      className={conn.active ? 'animate-dash' : ''}
                    />

                    {/* Pequena label opcional com o número da porta */}
                    {conn.label && (
                      <foreignObject
                        x={(x1 + x2) / 2 - 25}
                        y={(y1 + y2) / 2 - 10}
                        width="50"
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
            {nodes.map((node) => {
              const pos = nodePositions[node.id]
              if (!pos) return null

              const isActive = selectedNode?.id === node.id
              const nodeStyle = getNodeColorClass(node.status, node.type)
              const statusColor = node.status === 'ativo' || node.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'

              return (
                <motion.div
                  key={`${node.id}-${pos.x}-${pos.y}`}
                  drag={isEditing && node.type !== 'internet'}
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(e, info) => handleNodeDragEnd(node.id, info)}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute z-10 p-3 bg-bg-secondary border-2 rounded-xl flex items-center gap-3 shadow-2xl cursor-pointer select-none transition-colors ${
                    isActive ? 'ring-2 ring-accent scale-105 border-accent' : 'border-border-light hover:border-accent/40'
                  }`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    x: '-50%',
                    y: '-50%',
                    width: node.type === 'internet' ? '180px' : '150px'
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
                      {node.ip_address || 'Sem IP'}
                    </p>
                  </div>

                  {/* Pequena bolinha de status */}
                  {node.type !== 'internet' && (
                    <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${statusColor}`} />
                  )}
                </motion.div>
              )
            })}
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
