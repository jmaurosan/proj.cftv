import { useState, useEffect } from 'react'
import { Plus, Cable, QrCode } from 'lucide-react'
import { useCameras } from '../hooks/useCameras'
import type { Camera } from '../lib/types'
import { CABLE_TYPE_LABELS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CameraForm from '../components/forms/CameraForm'
import CableForm from '../components/forms/CableForm'
import { useToast } from '../components/ui/Toast'

export default function CamerasPage() {
  const { data, loading, create, update, remove } = useCameras()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Camera | null>(null)
  const [deleting, setDeleting] = useState<Camera | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cableCamera, setCableCamera] = useState<Camera | null>(null)
  const [qrCamera, setQrCamera] = useState<Camera | null>(null)
  const [cableTypes, setCableTypes] = useState<Record<string, string>>({})

  // Fetch cable types for all cameras to show badge
  const fetchCableTypes = async () => {
    const { data } = await supabase
      .from('cable_connections')
      .select('camera_id, cable_type')
    if (data) {
      const map: Record<string, string> = {}
      for (const row of data) {
        map[row.camera_id] = row.cable_type
      }
      setCableTypes(map)
    }
  }

  useEffect(() => {
    if (!loading) fetchCableTypes()
  }, [loading])

  const columns: Column<Camera>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    {
      key: 'connection_type',
      label: 'Conexão',
      render: (c) =>
        c.connection_type === 'ip' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400">
            IP{c.poe_powered ? ' ⚡' : ''}
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-500/15 text-slate-400">
            Analógica
          </span>
        ),
    },
    {
      key: 'dvr',
      label: 'DVR / IP',
      render: (c) =>
        c.connection_type === 'ip'
          ? c.ip_address ?? '-'
          : c.dvrs?.name ?? '-',
    },
    { key: 'channel_number', label: 'Canal', render: (c) => c.channel_number ?? '-' },
    { key: 'location', label: 'Localização' },
    { key: 'type', label: 'Tipo', render: (c) => c.type.charAt(0).toUpperCase() + c.type.slice(1) },
    {
      key: 'cable',
      label: 'Cabo',
      render: (c) => {
        const ct = cableTypes[c.id]
        if (!ct) return <span className="text-text-muted text-xs">-</span>
        const label = CABLE_TYPE_LABELS[ct] || ct
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent">
            {label}
          </span>
        )
      },
    },
    {
      key: 'qr_code',
      label: 'QR Code',
      render: (c) =>
        c.qr_code_url ? (
          <button
            onClick={() => setQrCamera(c)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
          >
            <QrCode className="w-3 h-3" />
            Ver
          </button>
        ) : (
          <span className="text-text-muted text-xs">-</span>
        ),
    },
    { key: 'status', label: 'Status', render: (c) => <Badge status={c.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast('Câmera atualizada com sucesso')
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('Câmera criada com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) toast('Câmera excluída com sucesso')
    else toast(result.error, 'error')
    setDeleteLoading(false)
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Câmeras</h2>
          <p className="text-text-muted text-sm mt-1">{data.length} registro(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Nova Câmera
        </Button>
      </div>

      <div className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          onEdit={(item) => { setEditing(item); setModalOpen(true) }}
          onDelete={(item) => setDeleting(item)}
          extraActions={(item) => (
            <button
              onClick={() => setCableCamera(item)}
              className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
              title="Cabeamento"
            >
              <Cable className="w-4 h-4" />
            </button>
          )}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar Câmera' : 'Nova Câmera'}
        size="lg"
      >
        <CameraForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <Modal
        open={!!cableCamera}
        onClose={() => setCableCamera(null)}
        title={`Cabeamento - ${cableCamera?.name ?? ''}`}
        size="lg"
      >
        {cableCamera && (
          <CableForm
            cameraId={cableCamera.id}
            onClose={() => setCableCamera(null)}
            onSaved={() => {
              fetchCableTypes()
              toast('Cabeamento salvo com sucesso')
            }}
          />
        )}
      </Modal>

      {/* Modal de visualização do QR Code */}
      <Modal
        open={!!qrCamera}
        onClose={() => setQrCamera(null)}
        title={`QR Code - ${qrCamera?.name ?? ''}`}
        size="sm"
      >
        {qrCamera?.qr_code_url && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={qrCamera.qr_code_url}
              alt={`QR Code da câmera ${qrCamera.name}`}
              className="max-w-full rounded-lg border border-border-light"
            />
            <p className="text-sm text-text-muted text-center">
              Use o app da câmera para escanear este QR Code e acessar o dispositivo.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQrCamera(null)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir Câmera"
        message={`Tem certeza que deseja excluir a câmera "${deleting?.name}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}
