import React from 'react';
import { Database, Search, Plus, ChevronRight, Info, ShieldCheck, RefreshCw, Upload, Edit2, Trash2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFetchTable, useDeleteRow } from '../hooks/useSupabase';
import { useStatusMonitor } from '../hooks/useStatusMonitor';
import { DVR, Screen } from '../types';

interface DVRListProps {
  onNavigate: (screen: Screen) => void;
  onEdit?: (dvr: any) => void;
}

export default function DVRList({ onNavigate, onEdit }: DVRListProps) {
  const { data: dvrs, loading, error, refresh } = useFetchTable<any>('dvrs');
  const { remove, loading: deleting } = useDeleteRow('dvrs');
  const { checkStatus, monitoring } = useStatusMonitor();
  const [selectedDvr, setSelectedDvr] = React.useState<any | null>(null);

  const handleTest = async (e: React.MouseEvent, dvr: any) => {
    e.stopPropagation();
    await checkStatus('dvrs', dvr.id, dvr.name);
    refresh();
  };

  const handleDelete = async (e: React.MouseEvent, dvr: any) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o DVR ${dvr.name}?`)) {
      await remove(dvr.id, dvr.name);
      refresh();
    }
  };

  React.useEffect(() => {
    if (dvrs.length > 0 && !selectedDvr) {
      setSelectedDvr(dvrs[0]);
    }
  }, [dvrs, selectedDvr]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight uppercase">Gestão de DVRs</h2>
          <p className="text-on-surface-variant font-medium text-sm">Integridade do sistema: <span className="text-primary">98.4% Ideal</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              className="w-full bg-surface-container-high border-none rounded-sm text-sm py-2.5 pl-10 pr-4 text-on-surface focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50" 
              placeholder="Filtrar por local ou IP..." 
              type="text"
            />
          </div>
          <button 
            onClick={() => onNavigate('add-dvr')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-sm font-bold text-sm tracking-wide active:scale-95 duration-150 uppercase"
          >
            <Plus className="w-4 h-4" />
            ADICIONAR DVR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DVR List */}
        <div className="lg:col-span-8 space-y-4">
          {dvrs.map((dvr: any) => (
            <motion.div 
              key={dvr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedDvr(dvr)}
              className={`bg-surface-container-high p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 cursor-pointer transition-all ${
                selectedDvr?.id === dvr.id ? 'border-primary bg-surface-container-highest' : 'border-transparent hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-container-highest flex items-center justify-center rounded-sm">
                  <Database className={`w-6 h-6 ${
                    dvr.status === 'online' ? 'text-primary' : 
                    dvr.status === 'warning' ? 'text-tertiary' : 'text-error'
                  }`} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface uppercase tracking-wide">{dvr.name}</h3>
                  <p className="text-xs text-on-surface-variant font-mono">{dvr.ip} • {dvr.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Status</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`w-2 h-2 rounded-full ${
                      dvr.status === 'online' ? 'bg-primary animate-pulse' : 
                      dvr.status === 'warning' ? 'bg-tertiary' : 'bg-error'
                    }`}></span>
                    <span className={`text-xs font-bold ${
                      dvr.status === 'online' ? 'text-primary' : 
                      dvr.status === 'warning' ? 'text-tertiary' : 'text-error'
                    }`}>
                      {dvr.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleTest(e, dvr)}
                    disabled={monitoring}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                    title="Testar Conexão"
                  >
                    <Activity className={`w-4 h-4 ${monitoring ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit?.(dvr); }}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, dvr)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedDvr && (
              <motion.div 
                key={selectedDvr.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-surface-container-high border-t-2 border-primary p-6 space-y-8 sticky top-24 rounded-sm"
              >
                <div>
                  <h3 className="font-headline font-bold text-on-surface text-xl mb-6 uppercase">ESPECIFICAÇÕES DA UNIDADE</h3>
                  <div className="space-y-6">
                    <DetailRow label="MARCA E MODELO" value={selectedDvr.model} subValue="Hikvision" />
                    <DetailRow label="FIRMWARE" value={selectedDvr.firmware} isMono />
                    <DetailRow label="ENDEREÇO IP" value={selectedDvr.ip} isMono isLink />
                  </div>
                </div>

                <div className="p-4 bg-surface-container-highest border border-outline-variant/10 rounded-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">CREDENCIAIS</h4>
                    <Info className="w-3 h-3 text-on-surface-variant cursor-pointer" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant mb-1">Usuário</p>
                      <p className="text-sm font-mono text-on-surface">{selectedDvr.user}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant mb-1">Senha</p>
                      <p className="text-sm font-mono text-on-surface">••••••••••••••••</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">STATUS HIKCONNECT</h4>
                  <div className={`flex items-center gap-3 p-3 rounded-sm ${selectedDvr.hikConnect ? 'bg-primary/10' : 'bg-surface-container-highest'}`}>
                    <ShieldCheck className={`w-5 h-5 ${selectedDvr.hikConnect ? 'text-primary' : 'text-on-surface-variant'}`} />
                    <div>
                      <p className={`text-xs font-bold tracking-wide uppercase ${selectedDvr.hikConnect ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {selectedDvr.hikConnect ? 'LINK CLOUD P2P ATIVO' : 'LINK CLOUD DESATIVADO'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {selectedDvr.hikConnect ? 'Acesso remoto operacional' : 'Sem conexão externa'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="text-[10px] font-bold py-2 border border-outline-variant/30 text-on-surface-variant hover:bg-surface-bright transition-colors uppercase flex items-center justify-center gap-2">
                      <RefreshCw className="w-3 h-3" /> REINICIAR
                    </button>
                    <button className="text-[10px] font-bold py-2 border border-outline-variant/30 text-on-surface-variant hover:bg-surface-bright transition-colors uppercase flex items-center justify-center gap-2">
                      <Upload className="w-3 h-3" /> ATUALIZAR
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, subValue, isMono, isLink }: any) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</span>
      <span className={`text-sm font-medium text-right text-on-surface ${isMono ? 'font-mono' : ''} ${isLink ? 'text-primary underline underline-offset-4 decoration-primary/30' : ''}`}>
        {value}
        {subValue && <><br/><span className="text-xs text-on-surface-variant">{subValue}</span></>}
      </span>
    </div>
  );
}
