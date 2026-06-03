import { Network, Search, Plus, Trash2, Cpu, Zap, Loader2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useFetchTable, useDeleteRow } from '../hooks/useSupabase';
import { PowerBalun, NetworkSwitch, Screen } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
  onEditBalun?: (balun: any) => void;
  onEditSwitch?: (sw: any) => void;
}

export default function InfrastructureInventory({ onNavigate, onEditBalun, onEditSwitch }: Props) {
  const { data: baluns, loading: loadingBaluns, refresh: refreshBaluns } = useFetchTable<PowerBalun>('power_baluns');
  const { data: switches, loading: loadingSwitches, refresh: refreshSwitches } = useFetchTable<NetworkSwitch>('network_switches');
  
  const { remove: removeBalun } = useDeleteRow('power_baluns');
  const { remove: removeSwitch } = useDeleteRow('network_switches');

  const handleDeleteBalun = async (balun: any) => {
    if (window.confirm(`Excluir o Power Balun ${balun.name}?`)) {
      await removeBalun(balun.id, balun.name);
      refreshBaluns();
    }
  };

  const handleDeleteSwitch = async (sw: any) => {
    if (window.confirm(`Excluir o Switch ${sw.name}?`)) {
      await removeSwitch(sw.id, sw.name);
      refreshSwitches();
    }
  };

  if (loadingBaluns || loadingSwitches) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight uppercase">Inventário de Infraestrutura</h2>
          <p className="text-on-surface-variant font-medium text-sm">Gerenciamento de hubs, baluns e ativos de rede.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Power Baluns Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-tertiary w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-wider text-on-surface">Power Baluns Ativos</h3>
            </div>
            <button 
              onClick={() => onNavigate('add-balun')}
              className="text-[10px] font-bold bg-tertiary text-on-tertiary px-3 py-1.5 rounded-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> NOVO BALUN
            </button>
          </div>

          <div className="space-y-3">
            {baluns.map(balun => (
              <div key={balun.id} className="bg-surface-container-high p-4 rounded-sm border-l-4 border-tertiary flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tertiary/10 flex items-center justify-center rounded-sm text-tertiary">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-sm uppercase">{balun.name}</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tighter">
                      {balun.brand} • {balun.model} • {balun.ports} PORTAS
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] text-on-surface-variant uppercase font-bold">{balun.location}</p>
                    <span className="text-[9px] text-primary font-mono uppercase">Status: {balun.status}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditBalun?.(balun)}
                      className="p-2 text-on-surface-variant hover:text-primary transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteBalun(balun)}
                      className="p-2 text-on-surface-variant hover:text-error transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Switches Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
            <div className="flex items-center gap-2">
              <Network className="text-primary w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-wider text-on-surface">Switches de Rede</h3>
            </div>
            <button 
              onClick={() => onNavigate('add-switch')}
              className="text-[10px] font-bold bg-primary text-on-primary px-3 py-1.5 rounded-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> NOVO SWITCH
            </button>
          </div>

          <div className="space-y-3">
            {switches.map(sw => (
              <div key={sw.id} className="bg-surface-container-high p-4 rounded-sm border-l-4 border-primary flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-sm text-primary">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-sm uppercase">{sw.name}</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tighter">
                      {sw.brand} • {sw.model} • IP: {sw.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] text-on-surface-variant uppercase font-bold">{sw.location}</p>
                    <span className="text-[9px] text-primary font-mono uppercase">{sw.ports} PORTAS</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditSwitch?.(sw)}
                      className="p-2 text-on-surface-variant hover:text-primary transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSwitch(sw)}
                      className="p-2 text-on-surface-variant hover:text-error transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
