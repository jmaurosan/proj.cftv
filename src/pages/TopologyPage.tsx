import { useState } from 'react'
import { Maximize2, Network, X } from 'lucide-react'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import NetworkTopology from '../components/NetworkTopology'
import Button from '../components/ui/Button'

export default function TopologyPage() {
  const [diagramOpen, setDiagramOpen] = useState(false)
  return (
    <div className="space-y-5">
      <ClientFilterBanner />
      {!diagramOpen ? <section className="bg-bg-secondary border border-border-light rounded-lg overflow-hidden">
        <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:items-center">
          <div><span className="inline-flex items-center gap-2 text-xs font-medium text-accent"><Network className="w-4 h-4" /> Documentação técnica opcional</span><h1 className="text-xl font-semibold text-text-primary mt-3">Diagrama da instalação</h1><p className="text-sm text-text-secondary mt-2 max-w-2xl">Use o diagrama para documentar conexões, localizar equipamentos e apresentar a estrutura do projeto. O inventário e os demais cadastros continuam funcionando normalmente sem abrir esta visualização.</p><div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs text-text-muted"><span>• Agrupamento por local e rack</span><span>• Ligações físicas persistidas</span><span>• Modo técnico editável</span></div></div>
          <Button onClick={() => setDiagramOpen(true)} className="h-11"><Maximize2 className="w-4 h-4" /> Abrir diagrama</Button>
        </div>
      </section> : <div className="space-y-3"><div className="flex justify-end"><Button variant="secondary" onClick={() => setDiagramOpen(false)}><X className="w-4 h-4" /> Fechar diagrama</Button></div><NetworkTopology /></div>}
    </div>
  )
}
