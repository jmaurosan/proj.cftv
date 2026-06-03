import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['#00E676', '#FFAB00', '#FF5252']; // Success, Warning, Error

export default function SystemAnalytics({ logs, cameras }: any) {
  // 1. Prepare Incident Data (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dayStr = format(date, 'dd/MM');
    const count = logs.filter((log: any) => 
      format(new Date(log.created_at), 'dd/MM') === dayStr && log.type === 'critical'
    ).length;
    return { name: dayStr, incidentes: count };
  }).reverse();

  // 2. Prepare Camera Status Data
  const online = cameras.filter((c: any) => c.status === 'online').length;
  const warning = cameras.filter((c: any) => c.status === 'warning').length;
  const offline = cameras.filter((c: any) => c.status === 'offline').length;
  
  const statusData = [
    { name: 'Online', value: online || 1 },
    { name: 'Alerta', value: warning || 0 },
    { name: 'Offline', value: offline || 0 }
  ];

  // 3. Simulated Network Usage Data
  const networkData = [
    { time: '00:00', mbps: 450 },
    { time: '04:00', mbps: 320 },
    { time: '08:00', mbps: 680 },
    { time: '12:00', mbps: 824 },
    { time: '16:00', mbps: 790 },
    { time: '20:00', mbps: 920 },
    { time: '23:59', mbps: 610 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Network Traffic - Area Chart */}
      <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
        <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6">Tráfego de Rede (24h)</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={networkData}>
              <defs>
                <linearGradient id="colorMbps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1B1F', border: '1px solid #49454F', fontSize: '10px' }}
                itemStyle={{ color: '#00E676' }}
              />
              <Area type="monotone" dataKey="mbps" stroke="#00E676" fillOpacity={1} fill="url(#colorMbps)" />
              <XAxis dataKey="time" stroke="#938F99" fontSize={9} tickLine={false} axisLine={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident History - Line Chart */}
      <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
        <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-error mb-6">Histórico de Alertas (7D)</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#49454F" vertical={false} />
              <XAxis dataKey="name" stroke="#938F99" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#938F99" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1B1F', border: '1px solid #49454F', fontSize: '10px' }}
              />
              <Line type="stepAfter" dataKey="incidentes" stroke="#FF5252" strokeWidth={2} dot={{ r: 3, fill: '#FF5252' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution - Pie Chart */}
      <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full">
          <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-surface mb-6">Saúde dos Dispositivos</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-3 min-w-[120px]">
          {statusData.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">{s.name}</span>
              </div>
              <span className="text-[10px] font-mono text-on-surface">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
        <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-surface mb-6">Métricas Operacionais</h3>
        <div className="space-y-4">
          <InsightRow label="Taxa de Disponibilidade" value="99.2%" color="text-primary" />
          <InsightRow label="Tempo Médio de Reposta" value="1.4s" color="text-on-surface" />
          <InsightRow label="Retenção de Dados" value="28.4 Dias" color="text-tertiary" />
          <InsightRow label="Carga de Processamento" value="34%" color="text-on-surface" />
        </div>
      </div>
    </div>
  );
}

function InsightRow({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline-variant/5">
      <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-tight">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
