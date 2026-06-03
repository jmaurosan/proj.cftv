import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Download, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { uploadDeviceBackup, listDeviceBackups, deleteDeviceBackup, getBackupDownloadUrl } from '../../services/backupService'
import type { DeviceBackup } from '../../lib/types'
import Button from './Button'
import { useToast } from './Toast'

interface BackupManagerProps {
  clientId: string | null
  equipmentType: 'router' | 'switch' | 'dvr'
  equipmentId: string
}

export default function BackupManager({ clientId, equipmentType, equipmentId }: BackupManagerProps) {
  const { toast } = useToast()
  const [backups, setBackups] = useState<DeviceBackup[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBackups()
  }, [equipmentId])

  const loadBackups = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listDeviceBackups(equipmentId)
    if (err) {
      setError(err)
    } else {
      setBackups(data)
    }
    setLoading(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const { data, error: err } = await uploadDeviceBackup(
      file,
      clientId,
      equipmentType,
      equipmentId,
      notes
    )

    if (err) {
      setError(err)
      toast('Erro ao fazer upload do backup', 'error')
    } else if (data) {
      setBackups((prev) => [data, ...prev])
      setNotes('')
      toast('Backup enviado com sucesso')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    setUploading(false)
  }

  const handleDelete = async (backupId: string, filePath: string) => {
    if (!confirm('Deseja realmente excluir este arquivo de backup?')) return

    const { error: err } = await deleteDeviceBackup(backupId, filePath)
    if (err) {
      toast('Erro ao excluir backup: ' + err, 'error')
    } else {
      setBackups((prev) => prev.filter((b) => b.id !== backupId))
      toast('Backup excluído com sucesso')
    }
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4 border border-slate-700/60 rounded-xl p-4 bg-slate-800/10">
      <div className="flex items-center justify-between border-b border-border-light pb-2">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Backups de Configuração
        </h3>
        <span className="text-xs text-text-muted">{backups.length} arquivo(s)</span>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-xs rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form de Upload */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Observações do backup (ex: Configuração final com VLAN 10)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-xs"
            disabled={uploading}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="shrink-0 flex items-center justify-center gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Configuração</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-text-muted">
          Selecione arquivos de configuração de roteadores, backups de switch ou de canais do DVR (.bin, .cfg, .dat, .txt, etc).
        </p>
      </div>

      {/* Lista de Arquivos */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border-light rounded-lg text-text-muted text-xs">
            Nenhum backup de configuração enviado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-2.5 bg-slate-800/40 border border-border-light/40 rounded-lg text-xs hover:border-border-light transition-colors"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-text-primary truncate block" title={backup.file_name}>
                      {backup.file_name}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0">
                      ({formatFileSize(backup.file_size)})
                    </span>
                  </div>
                  {backup.notes && (
                    <div className="text-[10px] text-text-secondary truncate mb-0.5">
                      Obs: {backup.notes}
                    </div>
                  )}
                  <div className="text-[9px] text-text-muted">
                    Enviado em: {new Date(backup.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={getBackupDownloadUrl(backup.file_path)}
                    download={backup.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-text-muted hover:text-accent rounded transition-colors"
                    title="Baixar arquivo de backup"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(backup.id, backup.file_path)}
                    className="p-1.5 text-text-muted hover:text-danger rounded transition-colors"
                    title="Excluir arquivo de backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
