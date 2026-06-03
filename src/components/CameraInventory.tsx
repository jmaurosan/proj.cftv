import React from 'react';
import { Video, Search, Plus, Settings, VideoOff, Eye, AlertTriangle, MoreVertical, Loader2, Edit2, Trash2, Activity, Info, Cable, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFetchTable, useDeleteRow } from '../hooks/useSupabase';
import { useStatusMonitor } from '../hooks/useStatusMonitor';
import { Screen, Camera } from '../types';
import { useImagenPlaceholder } from '../hooks/useImagenPlaceholder';

const crimpColors: Record<string, string[]> = {
  '568B': ['#ea580c', '#ea580c', '#16a34a', '#2563eb', '#2563eb', '#16a34a', '#78350f', '#78350f'],
  '568A': ['#16a34a', '#16a34a', '#ea580c', '#2563eb', '#2563eb', '#ea580c', '#78350f', '#78350f'],
  'SEQUENTIAL': ['#2563eb', '#2563eb', '#ea580c', '#ea580c', '#16a34a', '#16a34a', '#78350f', '#78350f']
};

const crimpBorderColors: Record<string, string[]> = {
  '568B': ['#ea580c', '', '#16a34a', '', '#2563eb', '', '#78350f', ''],
  '568A': ['#16a34a', '', '#ea580c', '', '#2563eb', '', '#78350f', ''],
  'SEQUENTIAL': ['', '#2563eb', '', '#ea580c', '', '#16a34a', '', '#78350f']
};

const parsePairMap = (pairMapStr: string) => {
  if (!pairMapStr) {
    return {
      vias_video: 'N/A',
      vias_power: 'N/A',
      power_source_type: 'N/A',
      has_splice: false,
      notes: 'Nenhuma observação técnica adicional registrada.'
    };
  }
  try {
    const parsed = JSON.parse(pairMapStr);
    if (parsed && typeof parsed === 'object') {
      return {
        vias_video: parsed.vias_video || '2 vias (1 par)',
        vias_power: parsed.vias_power || '2 vias (1 par)',
        power_source_type: parsed.power_source_type || 'Fonte Centralizada no DVR',
        has_splice: !!parsed.has_splice,
        notes: parsed.notes || 'Sem anotações adicionais.'
      };
    }
  } catch (e) {
    // É texto legado
  }
  return {
    vias_video: 'Legado (Não mapeado)',
    vias_power: 'Legado (Não mapeado)',
    power_source_type: 'Legado (Não mapeado)',
    has_splice: false,
    notes: pairMapStr
  };
};

interface CameraInventoryProps {
  onNavigate: (screen: Screen) => void;
  onEdit?: (camera: any) => void;
}

export default function CameraInventory({ onNavigate, onEdit }: CameraInventoryProps) {
  const { data: cameras, loading, error, refresh } = useFetchTable<any>('cameras');
  const { remove, loading: deleting } = useDeleteRow('cameras');
  const { checkStatus, monitoring } = useStatusMonitor();
  const [techDetails, setTechDetails] = React.useState<any | null>(null);

  const handleTest = async (camera: any) => {
    await checkStatus('cameras', camera.id, camera.name);
    refresh();
  };

  const handleDelete = async (camera: any) => {
    if (window.confirm(`Deseja excluir a câmera ${camera.name}?`)) {
      await remove(camera.id, camera.name);
      refresh();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  const details = techDetails ? parsePairMap(techDetails.pair_map) : null;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight uppercase">Inventário de Câmeras</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestão global de 1.240 nós de vigilância interconectados.</p>
        </div>
        <button 
          onClick={() => onNavigate('add-camera')}
          className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-sm flex items-center gap-2 active:scale-95 transition-transform uppercase"
        >
          <Plus className="w-4 h-4" />
          CADASTRAR CÂMERA
        </button>
      </header>

      {/* Filters */}
      <section className="bg-surface-container-low p-4 rounded-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input 
            className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-sm pl-10 py-2.5 rounded-sm placeholder:text-outline/50" 
            placeholder="Buscar por ID, Localização ou IP..." 
            type="text"
          />
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <FilterSelect label="Nó de DVR" options={['Todas Unidades', 'DVR-CENTRAL-01', 'DVR-NORTH-01']} />
          <FilterSelect label="Marca" options={['Todas Marcas', 'Hikvision', 'Intelbras', 'JFL']} />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">Protocolo</span>
            <div className="flex bg-surface-container-high p-1 rounded-sm">
              <button className="px-3 py-1 text-[11px] font-bold bg-primary text-on-primary rounded-sm">TUDO</button>
              <button className="px-3 py-1 text-[11px] font-bold text-on-surface-variant hover:text-on-surface">IP</button>
              <button className="px-3 py-1 text-[11px] font-bold text-on-surface-variant hover:text-on-surface">ANALOG</button>
            </div>
          </div>
        </div>
      </section>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {cameras.map((camera: any) => (
          <CameraCard 
            key={camera.id} 
            camera={camera} 
            onNavigate={onNavigate} 
            onEdit={() => onEdit?.(camera)}
            onDelete={() => handleDelete(camera)}
            onTest={() => handleTest(camera)}
            onViewTech={() => setTechDetails(camera)}
            isTesting={monitoring}
          />
        ))}
      </div>

      {/* Technical Details Modal */}
      <AnimatePresence>
        {techDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setTechDetails(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container-low border border-outline-variant/20 rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Cable className="w-5 h-5" />
                  <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Ficha Técnica: {techDetails.name}</h3>
                </div>
                <button onClick={() => setTechDetails(null)} className="text-on-surface-variant hover:text-primary">×</button>
              </div>
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* Informações básicas do cabo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Tipo de Cabo</p>
                    <p className="text-xs font-mono text-on-surface uppercase">{techDetails.cable_type} {techDetails.cable_category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Blindagem</p>
                    <p className="text-xs font-mono text-on-surface">{techDetails.is_shielded ? 'SIM (FTP/STP)' : 'NÃO (UTP)'}</p>
                  </div>
                </div>

                {/* ALERTA DE EMENDA DA SUGESTÃO 2 */}
                {details && details.has_splice && (
                  <div className="flex items-center gap-2 bg-error/15 text-error p-3 rounded-sm border border-error/25 text-[10px] font-bold uppercase tracking-wider animate-pulse leading-snug">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Atenção: Existe emenda física registrada no trajeto deste cabo!</span>
                  </div>
                )}

                {/* NOVOS CAMPOS ESTRUTURADOS DA SUGESTÃO 2 */}
                {details && (
                  <div className="space-y-4 pt-3 border-t border-outline-variant/10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Vias p/ Vídeo</p>
                        <p className="text-xs font-mono text-primary font-bold">{details.vias_video}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Vias p/ Energia</p>
                        <p className="text-xs font-mono text-primary font-bold">{details.vias_power}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Tipo de Alimentação</p>
                      <div className="flex items-center gap-1.5 text-xs text-on-surface font-semibold bg-surface-container-high p-2 rounded-sm border border-outline-variant/5">
                        <Zap className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <span>{details.power_source_type}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* DIAGRAMA VISUAL RJ45 DA SUGESTÃO 1 */}
                <div className="space-y-2 pt-3 border-t border-outline-variant/10">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Esquema RJ45 de Cores (Crimpagem)</p>
                  
                  {/* Barrinhas Coloridas */}
                  {(() => {
                    const standard = techDetails.crimp_standard || '568B';
                    const colors = crimpColors[standard] || crimpColors['568B'];
                    const borders = crimpBorderColors[standard] || crimpBorderColors['568B'];
                    
                    return (
                      <div className="flex bg-surface-container-high p-2.5 rounded-sm border border-outline-variant/10 items-center justify-between">
                        <div className="flex gap-1.5 h-8 bg-sky-200/5 rounded-sm p-1 border border-slate-500/10 shrink-0">
                          {colors.map((color, idx) => (
                            <div 
                              key={idx}
                              className="w-2 h-full rounded-sm relative shadow-inner"
                              style={{ 
                                backgroundColor: color,
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                              title={`${idx + 1}º Fio`}
                            >
                              {borders[idx] && (
                                <div 
                                  className="absolute inset-0 rounded-sm overflow-hidden"
                                  style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, ${borders[idx]}, ${borders[idx]} 2.5px, transparent 2.5px, transparent 5px)`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-right pl-2 shrink-0">
                          <p className="text-[10px] font-bold text-primary font-mono uppercase truncate max-w-[80px]">
                            {standard === 'SEQUENTIAL' ? 'Seq. Balun' : standard}
                          </p>
                          <span className="text-[8px] text-on-surface-variant uppercase font-bold tracking-tighter block leading-none">Pinagem</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ANOTAÇÕES DO MAPEAMENTO */}
                <div className="space-y-2 pt-3 border-t border-outline-variant/10">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">Observações Adicionais</p>
                  <div className="p-3 bg-primary/5 rounded-sm border border-primary/10">
                    <p className="text-[11px] text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
                      {(details && details.notes) || 'Nenhuma observação técnica registrada.'}
                    </p>
                  </div>
                </div>

              </div>
              <button 
                onClick={() => setTechDetails(null)}
                className="w-full py-4 bg-surface-container-highest text-on-surface-variant font-bold text-[10px] uppercase tracking-widest border-t border-outline-variant/10 hover:bg-surface-container-high transition-all"
              >
                FECHAR CONSULTA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="col-span-full py-12 flex flex-col items-center justify-center border-t border-dashed border-outline-variant/20 mt-8">
        <span className="text-on-surface-variant text-sm font-mono uppercase tracking-[0.2em] mb-2">Exibindo {cameras.length} nós ativos</span>
        <button className="text-primary font-bold text-[10px] tracking-widest hover:underline active:scale-95 transition-all">CARREGAR MAIS UNIDADES</button>
      </div>
    </div>
  );
}

interface CameraCardProps {
  camera: Camera;
  onNavigate: (screen: Screen) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  isTesting?: boolean;
}

const CameraCard = ({ camera, onNavigate, onEdit, onDelete, onTest, onViewTech, isTesting }: any) => {
  const { imageUrl, isLoading } = useImagenPlaceholder(
    `Security camera view of ${camera.name}, CCTV style, surveillance monitoring`,
    camera.imageUrl
  );

  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-container-high rounded-sm group overflow-hidden border border-transparent hover:border-primary/20 transition-all"
    >
      <div className="aspect-video bg-surface-container-lowest relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10"></div>
        {isLoading && !camera.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={camera.name} 
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${isLoading && !camera.imageUrl ? 'opacity-0' : 'opacity-50'}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <Video className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 z-20 flex gap-1">
          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm border ${
            camera.type === 'IP' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-tertiary/20 text-tertiary border-tertiary/30'
          }`}>
            {camera.type}
          </span>
          <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant text-[9px] font-bold rounded-sm uppercase">
            {camera.brand}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 z-20">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              camera.status === 'online' ? (camera.type === 'IP' ? 'bg-primary' : 'bg-tertiary') : 'bg-error animate-pulse'
            }`}></span>
            <span className={`text-[10px] font-mono font-bold ${
              camera.status === 'online' ? (camera.type === 'IP' ? 'text-primary' : 'text-tertiary') : 'text-error'
            }`}>
              {camera.status === 'offline' ? 'DESCONECTADA' : camera.ip}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-headline font-bold text-sm tracking-tight text-on-surface uppercase truncate">{camera.name}</h3>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-on-surface-variant font-medium">Armazenamento</span>
            <span className="text-on-surface font-mono">DVR-CENTRAL-01</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-on-surface-variant font-medium">Canal</span>
            <span className="text-on-surface font-mono">{camera.channel}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onViewTech?.(); }}
              className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
              title="Ficha Técnica de Cabeamento"
            >
              <Info className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onTest?.(); }}
              disabled={isTesting}
              className="p-1.5 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
              title="Testar Conexão"
            >
              <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onNavigate('test-view', camera)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              title="Painel de Teste e Frequência"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate('test-view', camera)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              title="Abrir Visualização Direta (RTSP/WebRTC)"
            >
              {camera.status === 'offline' ? <AlertTriangle className="w-4 h-4 text-error animate-pulse" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function FilterSelect({ label, options }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">{label}</span>
      <select className="bg-surface-container-high border-none text-sm py-2 px-4 rounded-sm focus:ring-1 focus:ring-primary min-w-[140px]">
        {options.map((opt: string) => <option key={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
