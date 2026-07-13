import { useState } from 'react'
import { BatteryCharging, Edit2, ExternalLink, PlugZap, Plus, ShieldCheck, Trash2, Zap } from 'lucide-react'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import NobreakForm from '../components/forms/NobreakForm'
import { useProjectAssets } from '../hooks/useProjectAssets'
import { useEquipmentOptions } from '../hooks/useEquipmentOptions'
import { useClient } from '../contexts/ClientContext'
import { describeBatteryBank, type Nobreak } from '../lib/projectAssets'
import { useToast } from '../components/ui/Toast'

export default function PowerProtectionPage() {
  const { selectedClientId } = useClient()
  const { toast } = useToast()
  const { assets, loading, error, saveNobreak, removeNobreak } = useProjectAssets()
  const { options: equipmentOptions, error: equipmentError } = useEquipmentOptions(selectedClientId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Nobreak | null>(null)

  const handleSave = async (nobreak: Nobreak) => {
    const result = await saveNobreak(nobreak)
    if (!result.error) {
      toast(editing ? 'Nobreak atualizado com sucesso.' : 'Nobreak cadastrado com sucesso.')
      setModalOpen(false)
      setEditing(null)
    }
    return result
  }

  const handleDelete = async (nobreak: Nobreak) => {
    if (!confirm(`Excluir o nobreak "${nobreak.name}"?`)) return
    const result = await removeNobreak(nobreak.id)
    if (result.error) toast(result.error, 'error')
    else toast('Nobreak excluído com sucesso.')
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-7">
      <ClientFilterBanner />
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="flex items-center gap-2 text-xl font-bold text-text-primary"><BatteryCharging className="h-5 w-5 text-accent" /> Nobreaks</h1><p className="mt-1 text-sm text-text-muted">Proteção elétrica, potência, tomadas e banco de baterias do sistema.</p></div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }} disabled={!selectedClientId}><Plus className="h-4 w-4" /> Novo Nobreak</Button>
      </header>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {equipmentError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{equipmentError}</div>}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-light bg-border-light lg:grid-cols-4">
        {[
          { label: 'Nobreaks', value: assets.nobreaks.length, icon: BatteryCharging },
          { label: 'Protegidos', value: assets.nobreaks.filter((item) => item.hasProtection).length, icon: ShieldCheck },
          { label: 'Baterias', value: assets.nobreaks.reduce((sum, item) => sum + item.batteryQuantity, 0), icon: Zap },
          { label: 'Tomadas', value: assets.nobreaks.reduce((sum, item) => sum + item.outletQuantity, 0), icon: PlugZap },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="bg-bg-secondary p-4"><div className="flex items-center gap-2 text-xs text-text-muted"><Icon className="h-4 w-4 text-accent" /> {label}</div><div className="mt-1 text-2xl font-bold text-text-primary">{value}</div></div>)}
      </div>

      <section className="space-y-4">
        <div><h2 className="text-lg font-bold text-text-primary">Proteção e Alimentação</h2><p className="mt-1 text-sm text-text-muted">Equipamentos responsáveis pela continuidade do sistema CFTV.</p></div>
        {assets.nobreaks.length === 0 ? <div className="border border-dashed border-border-light py-12 text-center text-sm text-text-muted">Nenhum nobreak cadastrado para este cliente.</div> : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{assets.nobreaks.map((nobreak) => (
            <article key={nobreak.id} className="rounded-lg border border-border-light bg-bg-secondary p-4">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="rounded-lg bg-accent/10 p-2.5 text-accent"><BatteryCharging className="h-5 w-5" /></div><div><h3 className="font-semibold text-text-primary">{nobreak.name}</h3><p className="text-xs text-text-muted">{nobreak.brand} {nobreak.model} · {nobreak.location}</p></div></div><div className="flex gap-1"><button type="button" onClick={() => { setEditing(nobreak); setModalOpen(true) }} title="Editar nobreak" className="p-2 text-text-muted hover:text-accent"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={() => handleDelete(nobreak)} title="Excluir nobreak" className="p-2 text-text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button></div></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-5"><div><span className="block text-text-muted">Potência</span><strong className="text-text-primary">{nobreak.ratedPowerVa} VA / {nobreak.ratedPowerWatts} W</strong></div><div><span className="block text-text-muted">Entrada / saída</span><strong className="text-text-primary">{nobreak.inputVoltage} V / {nobreak.outputVoltage} V</strong></div><div><span className="block text-text-muted">Tomadas</span><strong className="text-text-primary">{nobreak.outletQuantity}</strong></div><div><span className="block text-text-muted">Banco de baterias</span><strong className="text-text-primary">{describeBatteryBank(nobreak)}</strong></div><div><span className="block text-text-muted">Autonomia</span><strong className="text-text-primary">{nobreak.autonomyMinutes ? `${nobreak.autonomyMinutes} min` : 'Não informada'}</strong></div></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-light pt-3 text-xs"><span className={`rounded px-2 py-1 ${nobreak.hasProtection ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{nobreak.hasProtection ? `${nobreak.protections.length} proteção(ões)` : 'Sem proteção informada'}</span><span className="rounded bg-bg-primary px-2 py-1 text-text-secondary">{nobreak.powersWholeProject ? 'Alimenta todo o sistema' : `${nobreak.poweredEquipmentIds.length} equipamento(s)`}</span>{nobreak.manufacturerUrl && <a href={nobreak.manufacturerUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Ficha técnica</a>}</div>
            </article>
          ))}</div>
        )}
      </section>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Editar Nobreak' : 'Novo Nobreak'} size="lg">
        <NobreakForm initialData={editing} equipmentOptions={equipmentOptions} onSubmit={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} />
      </Modal>
    </div>
  )
}
