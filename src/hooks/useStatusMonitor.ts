import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useUpdateRow } from './useSupabase';

export function useStatusMonitor() {
  const [monitoring, setMonitoring] = useState(false);
  const { update } = useUpdateRow(''); // We'll set the table dynamically

  const checkStatus = async (table: string, id: string, name: string) => {
    setMonitoring(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random status for simulation
    const statuses = ['online', 'online', 'online', 'online', 'warning', 'offline'];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    try {
      // Update the equipment status
      await supabase.from(table).update({ status: newStatus }).eq('id', id);
      
      // Log the activity
      const logMessage = newStatus === 'online' 
        ? `Equipamento ${name} respondeu ao ping com sucesso.` 
        : newStatus === 'warning'
        ? `Latência alta detectada em ${name}. Verifique cabeamento.`
        : `FALHA CRÍTICA: ${name} não responde ao ping.`;

      await supabase.from('activity_logs').insert([{
        type: newStatus === 'online' ? 'system' : newStatus === 'warning' ? 'warning' : 'critical',
        message: logMessage,
        location: table.toUpperCase()
      }]);

      return { success: true, status: newStatus };
    } catch (err) {
      console.error('Erro no monitoramento:', err);
      return { success: false };
    } finally {
      setMonitoring(false);
    }
  };

  return { checkStatus, monitoring };
}
