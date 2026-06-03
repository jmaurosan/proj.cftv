import React from 'react';
import { Video, Gauge, Database, AlertTriangle, ChevronRight, Activity, Terminal, ShieldAlert, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { MOCK_LOGS, MOCK_ALERTAS } from '../constants';
import { useImagenPlaceholder } from '../hooks/useImagenPlaceholder';
import { useFetchTable } from '../hooks/useSupabase';
import { useStatusMonitor } from '../hooks/useStatusMonitor';
import SystemAnalytics from './SystemAnalytics';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { data: dvrs } = useFetchTable<any>('dvrs');
  const { data: cameras } = useFetchTable<any>('cameras');
  const { data: logs, refresh: refreshLogs } = useFetchTable<any>('activity_logs');
  const { checkStatus, monitoring } = useStatusMonitor();
  const [seeding, setSeeding] = React.useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      // 1. Criar DVRs
      const { data: dvrData } = await supabase.from('dvrs').insert([
        { name: 'DVR-PORTARIA', brand: 'Hikvision', model: 'DS-7216', ip: '192.168.1.10', location: 'Guarita', channels: 16 },
        { name: 'DVR-RESERVA', brand: 'Intelbras', model: 'MHDX 3108', ip: '192.168.1.11', location: 'Rack A1', channels: 8 }
      ]).select();

      if (dvrData) {
        // 2. Criar Câmeras vinculadas ao primeiro DVR
        await supabase.from('cameras').insert([
          { dvr_id: dvrData[0].id, name: 'CAM-ENTRADA-VEICULOS', type: 'IP', ip: '192.168.1.101', brand: 'Hikvision', channel: '01', location: 'Portão Principal' },
          { dvr_id: dvrData[0].id, name: 'CAM-SOCIAL-INTERNO', type: 'ANALOG', brand: 'Intelbras', channel: '02', location: 'Hall Social' },
          { dvr_id: dvrData[1].id, name: 'CAM-SALA-MAQUINAS', type: 'IP', ip: '192.168.1.105', brand: 'JFL', channel: '01', location: 'Subsolo' }
        ]);
      }

      // 3. Criar Infra
      await supabase.from('power_baluns').insert([
        { name: 'BALUN-RACK-01', brand: 'INTELBRAS', model: 'VW 1-16', ports: 16, location: 'Rack Principal' }
      ]);

      await supabase.from('network_switches').insert([
        { name: 'SW-CORE-POE', brand: 'TP-Link', model: 'TL-SG1024', ip: '192.168.1.254', ports: 24, location: 'Sala de TI' }
      ]);

      alert('Banco de dados populado com sucesso!');
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao gerar dados: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const criticalLogs = logs.filter(l => l.type === 'critical').length;
  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const cameraHealth = cameras.length > 0 ? Math.round((onlineCameras / cameras.length) * 100) : 100;

  const handleSystemCheck = async () => {
    // Check first 2 items of each table for simulation
    const allItems = [
      ...dvrs.slice(0, 1).map(d => ({ table: 'dvrs', ...d })),
      ...cameras.slice(0, 2).map(c => ({ table: 'cameras', ...c }))
    ];

    for (const item of allItems) {
      await checkStatus(item.table, item.id, item.name);
    }
    refreshLogs();
  };

  const { imageUrl: mapUrl, isLoading: isMapLoading } = useImagenPlaceholder(
    "Technical network topology map for a security system, blueprint style, glowing lines, tactical interface",
    "https://picsum.photos/seed/map1/1200/800?grayscale"
  );

  return (
    <div className="p-6 md:p-8 space-y-8 relative">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight uppercase">Dashboard CFTV</h2>
          <p className="text-on-surface-variant text-sm mt-1">Integridade do sistema: <span className={cameraHealth > 90 ? "text-primary" : "text-error"}>{cameraHealth}% {cameraHealth > 90 ? 'Ideal' : 'Atenção'}</span></p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-sm border border-outline-variant/20 hover:text-primary transition-all flex items-center gap-2"
          >
            {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            {seeding ? 'GERANDO...' : 'GERAR DADOS TESTE'}
          </button>
          <button 
            onClick={handleSystemCheck}
            disabled={monitoring}
            className="px-4 py-2 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest rounded-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {monitoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
            {monitoring ? 'VERIFICANDO...' : 'CHECKOUT GERAL'}
          </button>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-sm border border-outline-variant/10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-mono text-on-surface-variant">UPTIME_SIS: 142:12:04</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="TOTAL DE CÂMERAS" 
          value={cameras.length.toString()} 
          subValue="ATIVAS" 
          icon={Video} 
          progress={95} 
          color="primary" 
        />
        <StatCard 
          label="CARGA DE REDE" 
          value="824" 
          subValue="Mbps" 
          icon={Activity} 
          footer="PICO DO SISTEMA: 1.2 Gbps" 
          color="primary" 
        />
        <StatCard 
          label="ARMAZENAMENTO" 
          value="78" 
          subValue="%" 
          icon={Database} 
          footer="LIMITE DE RETENÇÃO: 30 DIAS" 
          color="tertiary" 
        />
        <StatCard 
          label="ALERTAS CRÍTICOS" 
          value={criticalLogs.toString().padStart(2, '0')} 
          subValue="ATIVOS" 
          icon={AlertTriangle} 
          footer={logs.length > 0 ? `Último log: ${format(new Date(logs[0].created_at), "HH:mm'h'", { locale: ptBR })}` : 'Sem incidentes'} 
          color="error" 
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DVRs Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-primary">INVENTÁRIO DE DVRS</h3>
              <button className="text-[10px] uppercase font-bold text-primary hover:underline">VER TUDO</button>
            </div>
            <div className="space-y-3">
              {dvrs.slice(0, 3).map((dvr: any) => (
                <div key={dvr.id} className="bg-surface-container-high p-4 flex items-center justify-between border-l-2 border-primary/30 hover:border-primary transition-all cursor-pointer">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface uppercase">{dvr.name}</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono">{dvr.ip}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 font-mono rounded-sm ${
                      dvr.status === 'online' ? 'bg-primary-container text-primary' : 
                      dvr.status === 'warning' ? 'bg-tertiary-container text-tertiary' : 
                      'bg-error-container text-error'
                    }`}>
                      {(dvr.status || 'online').toUpperCase()}
                    </span>
                    <p className="text-[9px] text-on-surface-variant mt-1">{dvr.channels} CH</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics and Map Column */}
        <div className="lg:col-span-2 space-y-6">
          <SystemAnalytics logs={logs} cameras={cameras} />

          <div className="relative bg-surface-container-low aspect-video rounded-sm overflow-hidden group border border-outline-variant/10">
            {isMapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low z-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            <img 
              src={mapUrl} 
              alt="Network Map" 
              className={`w-full h-full object-cover opacity-40 transition-opacity duration-700 ${isMapLoading ? 'opacity-0' : 'opacity-40'}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
              <div className="flex justify-between items-start">
                <div className="bg-surface-bright/60 backdrop-blur-md p-3 border border-outline-variant/20 rounded-sm pointer-events-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <p className="text-[10px] font-bold text-primary uppercase">Gateway Principal Ativo</p>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">LAT: 40.7128 N | LON: 74.0060 W</p>
                </div>
              </div>
              <div className="bg-surface-bright/60 backdrop-blur-md p-4 border border-outline-variant/20 rounded-sm w-fit pointer-events-auto">
                <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest mb-2">VISTA DO MAPA DA UNIDADE</h4>
                <div className="flex gap-4">
                  <MapLegend color="bg-primary" label="Zona A" />
                  <MapLegend color="bg-tertiary" label="Zona B" />
                  <MapLegend color="bg-error" label="Zona C" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-low p-6 rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-primary">LOGS DE INFRAESTRUTURA</h3>
                <div className="flex gap-1">
                  <button className="text-[8px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-sm">TUDO</button>
                  <button className="text-[8px] font-bold px-2 py-0.5 text-on-surface-variant hover:text-error transition-colors">ERROS</button>
                </div>
              </div>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className={`flex items-start gap-3 p-3 bg-surface-container-high border-l-2 ${
                    log.type === 'critical' ? 'border-error' : log.type === 'warning' ? 'border-tertiary' : 'border-primary'
                  } rounded-sm`}>
                    <Terminal className={`w-4 h-4 mt-1 ${
                      log.type === 'critical' ? 'text-error' : log.type === 'warning' ? 'text-tertiary' : 'text-primary'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-on-surface font-body leading-relaxed">{log.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] font-mono text-on-surface-variant uppercase">{log.location}</span>
                        <span className="text-[9px] font-mono text-on-surface-variant">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="py-8 text-center text-[10px] uppercase tracking-widest text-on-surface-variant border border-dashed border-outline-variant/20">
                    Nenhum evento registrado
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-sm">
              <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">ALERTAS RECENTES</h3>
              <div className="overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead className="text-on-surface-variant uppercase tracking-tighter border-b border-outline-variant/10">
                    <tr>
                      <th className="py-2">Origem</th>
                      <th className="py-2 text-right">Evento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {MOCK_ALERTAS.map((alerta) => (
                      <tr key={alerta.id} className="hover:bg-surface-container-high transition-colors">
                        <td className="py-3 font-bold text-on-surface">{alerta.origin}</td>
                        <td className={`py-3 text-right ${
                          alerta.status === 'warning' ? 'text-tertiary' : 
                          alerta.status === 'online' ? 'text-primary' : 'text-on-surface-variant'
                        }`}>{alerta.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual FAB */}
      <button className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-sm shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group">
        <ShieldAlert className="w-8 h-8 fill-on-primary/20" />
        <span className="absolute right-16 bg-surface-container-highest text-on-surface text-[10px] font-bold px-3 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-outline-variant/20 uppercase tracking-widest">
          Alerta de Segurança
        </span>
      </button>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, progress, footer, color }: any) {
  const colorClass = color === 'primary' ? 'text-primary' : color === 'tertiary' ? 'text-tertiary' : 'text-error';
  const bgColorClass = color === 'primary' ? 'bg-primary/10' : color === 'tertiary' ? 'bg-tertiary/10' : 'bg-error/10';

  return (
    <div className={`bg-surface-container-high p-5 rounded-sm relative overflow-hidden group ${color === 'error' ? 'border-l-2 border-error' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${color === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>{label}</span>
        <Icon className={`${colorClass} w-4 h-4`} />
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className="text-4xl font-headline font-bold text-on-surface">{value}</h2>
        <span className={`text-[10px] ${colorClass} ${bgColorClass} px-1.5 py-0.5 rounded-sm font-bold`}>{subValue}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-[2px] bg-outline-variant/20 w-full overflow-hidden">
          <div className={`h-full ${color === 'primary' ? 'bg-primary' : 'bg-tertiary'} w-[${progress}%]`}></div>
        </div>
      )}
      {footer && <p className={`text-[10px] mt-2 ${color === 'error' ? 'text-error/80' : 'text-on-surface-variant'}`}>{footer}</p>}
    </div>
  );
}

function HealthBar({ label, value, unit = '%' }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-on-surface-variant uppercase tracking-tighter">{label}</span>
        <span className="text-on-surface font-mono">{value}{unit}</span>
      </div>
      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500" 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

function MapLegend({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`}></span>
      <span className="text-[10px] text-on-surface-variant">{label}</span>
    </div>
  );
}
