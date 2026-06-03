import React, { useState } from 'react';
import { Network, Printer, RefreshCw, Video, Database, AlertCircle, Terminal, MapPin, Cloud, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFetchTable, useInsertRow } from '../hooks/useSupabase';

export default function InfrastructureMap() {
  const [selectedPort, setSelectedPort] = useState<{ type: 'switch' | 'balun', number: number, id?: string } | null>(null);
  
  const { data: cameras } = useFetchTable<any>('cameras');
  const { data: baluns } = useFetchTable<any>('power_baluns');
  const { data: connections, refresh: refreshConnections } = useFetchTable<any>('connections');
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface uppercase">Arquitetura de Rede</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Vista de Manutenção: Mapeamento da Camada Física e Alocação de Portas</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-high px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 rounded-sm hover:bg-surface-container-highest transition-colors">
            <Printer className="w-4 h-4" /> EXPORTAR ESQUEMA
          </button>
          <button className="bg-primary text-on-primary px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> ESCANEAR NÓS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
          <section className="bg-surface-container-low p-6 rounded-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary"></div>
                <div>
                  <h3 className="font-headline text-lg font-bold uppercase">Switch Principal: Rack-Principal-01</h3>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Switch POE+ Gerenciável de 26 Portas | IP: 10.0.1.254</p>
                </div>
              </div>
              <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 border border-primary/20 rounded-sm">STATUS: ONLINE</span>
            </div>

            {/* Physical Switch Representation */}
            <div className="bg-surface-container-lowest p-8 border border-outline-variant/10 rounded-sm overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <SwitchPort 
                      number={i * 2 + 1} 
                      onClick={() => setSelectedPort({ type: 'switch', number: i * 2 + 1 })}
                      connection={connections.find(c => c.source_type === 'switch' && c.source_port === i * 2 + 1)} 
                    />
                    <SwitchPort 
                      number={i * 2 + 2} 
                      onClick={() => setSelectedPort({ type: 'switch', number: i * 2 + 2 })}
                      connection={connections.find(c => c.source_type === 'switch' && c.source_port === i * 2 + 2)} 
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-2 ml-4">
                  <div className="w-12 h-10 bg-primary-container border-2 border-primary/30 flex items-center justify-center relative rounded-sm">
                    <span className="text-[7px] text-primary absolute -bottom-4">SFP1</span>
                    <RefreshCw className="w-3 h-3 text-primary" />
                  </div>
                  <div className="w-12 h-10 bg-surface-container-high border border-outline-variant/20 flex items-center justify-center relative rounded-sm">
                    <span className="text-[7px] text-on-surface-variant absolute -bottom-4">SFP2</span>
                    <RefreshCw className="w-3 h-3 text-on-surface-variant" />
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Mapping Table */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-4 font-medium">Porta</th>
                    <th className="py-3 px-4 font-medium">Equipamento Conectado</th>
                    <th className="py-3 px-4 font-medium">Interface</th>
                    <th className="py-3 px-4 font-medium">Carga/Potência</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-body divide-y divide-outline-variant/5">
                  {connections.filter(c => c.source_type === 'switch').map(conn => {
                    const target = conn.target_type === 'camera' 
                      ? cameras.find((c: any) => c.id === conn.target_id)
                      : baluns.find((b: any) => b.id === conn.target_id);
                    
                    return (
                      <TableRow 
                        key={conn.id}
                        port={`P${conn.source_port.toString().padStart(2, '0')}`} 
                        name={target?.name || 'Equipamento Desconhecido'} 
                        icon={conn.target_type === 'camera' ? Video : Database} 
                        type={conn.target_type === 'camera' ? 'Gbit/s POE' : 'VLAN Data'} 
                        load={conn.target_type === 'camera' ? '12.4W / 48V' : 'Link Ativo'} 
                      />
                    );
                  })}
                  {connections.filter(c => c.source_type === 'switch').length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Nenhuma porta mapeada no Switch
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {baluns.map((balun: any) => (
              <BalunCard 
                key={balun.id}
                balun={balun}
                onPortClick={(portNum: number) => setSelectedPort({ type: 'balun', number: portNum, id: balun.id })}
                connections={connections.filter(c => c.source_type === 'balun' && c.source_id === balun.id)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
          <section className="bg-surface-container-low p-6 rounded-sm">
            <h4 className="font-headline font-bold text-on-surface mb-4 uppercase tracking-wider">Topologia Lógica</h4>
            <div className="relative w-full aspect-video bg-surface-container-lowest rounded-sm overflow-hidden border border-outline-variant/10">
              <img 
                src="https://picsum.photos/seed/topo1/600/400?grayscale" 
                alt="Topology" 
                className="w-full h-full object-cover opacity-20 grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Cloud className="w-6 h-6" />
                </div>
                <div className="w-px h-8 bg-outline-variant/50"></div>
                <div className="px-3 py-2 bg-surface-container-high border border-primary/50 text-[10px] font-mono rounded-sm text-on-surface">GATEWAY-PRINCIPAL</div>
                <div className="w-px h-8 bg-outline-variant/50"></div>
                <div className="flex gap-8">
                  <div className="px-3 py-2 bg-primary text-on-primary text-[10px] font-bold rounded-sm">SWITCH-A</div>
                  <div className="px-3 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-sm">SWITCH-B</div>
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-surface-bright/80 backdrop-blur-md p-2 px-3 rounded-sm border border-outline-variant/20 shadow-lg">
                <p className="text-[7px] uppercase tracking-widest text-on-surface-variant mb-0.5">Localização Atual</p>
                <p className="text-[9px] font-bold text-on-surface flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-primary" /> RACK A1 - SALA A1
                </p>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-6">
              <Terminal className="text-primary w-5 h-5" />
              <h4 className="font-headline font-bold text-on-surface uppercase tracking-wider">Console de Manutenção</h4>
            </div>
            <div className="font-mono text-[11px] space-y-4 text-on-surface-variant">
              <ConsoleLog type="system" message="Verificação de diagnóstico concluída. Sem erros de CRC na Porta 1-12." />
              <ConsoleLog type="warning" message="Limite térmico do Balun VW 8 em 42°C. Monitorando." />
              <ConsoleLog type="critical" message="Link da Porta 4 fora do ar. Verifique a terminação física do UTP." />
            </div>
          </section>
        </div>
      </div>
      <AnimatePresence>
        {selectedPort && (
          <PortMappingModal 
            port={selectedPort} 
            cameras={cameras}
            baluns={baluns}
            onClose={() => setSelectedPort(null)}
            onSave={() => {
              refreshConnections();
              setSelectedPort(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PortMappingModal({ port, cameras, baluns, onClose, onSave }: any) {
  const { insert, loading } = useInsertRow('connections');
  const [target, setTarget] = useState<{ type: string, id: string }>({ type: 'camera', id: '' });

  const handleSave = async () => {
    if (!target.id) return;
    await insert({
      source_type: port.type,
      source_port: port.number,
      target_type: target.type,
      target_id: target.id
    });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-container-high border border-outline-variant/20 w-full max-w-md p-6 rounded-sm shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline font-bold uppercase tracking-widest text-on-surface">
            Mapear Porta {port.number} ({port.type.toUpperCase()})
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
              Tipo de Equipamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setTarget({ ...target, type: 'camera' })}
                className={`py-2 text-[10px] font-bold rounded-sm border transition-all ${target.type === 'camera' ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'}`}
              >
                CÂMERA
              </button>
              <button 
                onClick={() => setTarget({ ...target, type: 'balun' })}
                className={`py-2 text-[10px] font-bold rounded-sm border transition-all ${target.type === 'balun' ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'}`}
              >
                POWER BALUN
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
              Selecionar Dispositivo
            </label>
            <select 
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-sm p-3 text-sm text-on-surface outline-none focus:border-primary transition-colors"
              value={target.id}
              onChange={(e) => setTarget({ ...target, id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {target.type === 'camera' ? (
                cameras.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.brand})</option>)
              ) : (
                baluns.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)
              )}
            </select>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading || !target.id}
            className="w-full bg-primary text-on-primary py-3 text-xs font-bold uppercase tracking-widest rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SALVAR CONEXÃO
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SwitchPort({ number, onClick, connection }: any) {
  const status = connection ? 'active' : 'inactive';
  const colorClass = status === 'active' ? 'border-primary' : 'border-outline-variant/20';
  const dotClass = status === 'active' ? 'bg-primary shadow-[0_0_8px_#abcae8]' : 'bg-transparent';

  return (
    <button 
      onClick={onClick}
      className={`w-10 h-10 bg-surface-container-high border-t-2 ${colorClass} flex items-center justify-center relative rounded-sm group transition-all hover:bg-surface-container-highest`}
    >
      <span className={`text-[9px] font-mono text-on-surface-variant`}>
        {number.toString().padStart(2, '0')}
      </span>
      <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dotClass}`}></div>
      {connection && (
        <div className="absolute hidden group-hover:block bottom-full mb-2 bg-surface-container-highest text-[8px] p-2 whitespace-nowrap z-10 border border-outline-variant/20 shadow-xl">
          Conectado: {connection.target_type.toUpperCase()}
        </div>
      )}
    </button>
  );
}

function TableRow({ port, name, icon: Icon, type, load, isError }: any) {
  return (
    <tr className={`${isError ? 'bg-error/5' : 'bg-surface'} hover:bg-surface-container-high transition-colors`}>
      <td className={`py-4 px-4 font-mono ${isError ? 'text-error' : 'text-primary'}`}>{port}</td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isError ? 'text-error' : 'text-on-surface-variant'}`} />
          <span className={`font-medium ${isError ? 'text-error' : 'text-on-surface'}`}>{name}</span>
        </div>
      </td>
      <td className={`py-4 px-4 ${isError ? 'text-error' : 'text-on-surface-variant'}`}>{type}</td>
      <td className={`py-4 px-4 ${isError ? 'text-error' : 'text-on-surface-variant'}`}>{load}</td>
    </tr>
  );
}

function BalunCard({ balun, onPortClick, connections }: any) {
  return (
    <section className="bg-surface-container-low p-6 rounded-sm border-l-4 border-tertiary">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-headline font-bold text-on-surface uppercase">{balun.name}</h4>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Hub Power Balun Ativo</p>
        </div>
        <span className="bg-tertiary-container text-tertiary px-2 py-0.5 text-[10px] font-bold rounded-sm">{balun.location}</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs py-2 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Capacidade</span>
          <span className="font-mono text-on-surface">{balun.ports} Portas</span>
        </div>
        <div className="grid grid-cols-8 gap-1 mt-4">
          {Array.from({ length: balun.ports }).map((_, i) => {
            const conn = connections.find((c: any) => c.source_port === i + 1);
            return (
              <button 
                key={i} 
                onClick={() => onPortClick(i + 1)}
                className={`w-full aspect-square border rounded-[1px] flex items-center justify-center transition-all hover:scale-110 ${
                  conn ? 'bg-tertiary/20 border-tertiary/40 text-tertiary' : 'bg-surface-container-highest border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                <span className="text-[8px] font-bold">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ConsoleLog({ type, message }: any) {
  const colorClass = type === 'critical' ? 'text-error' : type === 'warning' ? 'text-tertiary' : 'text-primary';
  const borderColorClass = type === 'critical' ? 'border-error' : type === 'warning' ? 'border-tertiary' : 'border-primary';

  return (
    <div className={`p-3 bg-surface-container-lowest border-l-2 ${borderColorClass} rounded-sm`}>
      <span className={`${colorClass} font-bold mr-2`}>[{type.toUpperCase()}]</span> {message}
    </div>
  );
}
