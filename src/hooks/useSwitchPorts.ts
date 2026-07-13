import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { translateError } from '../lib/errorTranslator';
import { validatePortAssignment } from '../lib/connectionValidation';

export interface SwitchPort {
  id?: string;
  switch_id: string;
  port_number: number;
  device_type?: string | null;
  device_id?: string | null;
  device_name?: string | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export function useSwitchPorts(switchId: string | null) {
  const { user } = useAuth();
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!switchId) { 
      setPorts([]); 
      return; 
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('switch_ports')
      .select('*')
      .eq('switch_id', switchId)
      .order('port_number');
    if (!error) {
      setPorts((data as SwitchPort[]) || []);
    }
    setLoading(false);
  }, [switchId]);

  useEffect(() => { 
    fetch(); 
  }, [fetch]);

  const savePort = async (port: { port_number: number; device_type?: string | null; device_id?: string | null; device_name?: string | null; is_active?: boolean; notes?: string }) => {
    if (!switchId) return { error: 'Sem switch' };
    if (!user) return { error: 'Não autenticado' };
    const { data: currentPorts, error: validationError } = await supabase
      .from('switch_ports')
      .select('port_number, device_id, device_name')
      .eq('switch_id', switchId);
    if (validationError) return { error: `Não foi possível validar as portas: ${translateError(validationError)}` };
    const conflict = validatePortAssignment(
      (currentPorts || []).map((item) => ({ port_number: item.port_number, target_id: item.device_id, target_name: item.device_name })),
      { port_number: port.port_number, target_id: port.device_id },
      'switch',
    );
    if (conflict) return { error: conflict };
    const { data: existing } = await supabase
      .from('switch_ports')
      .select('id')
      .eq('switch_id', switchId)
      .eq('port_number', port.port_number)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('switch_ports').update({
        device_type: port.device_type || null,
        device_id: port.device_id || null,
        device_name: port.device_name || null,
        is_active: port.is_active ?? true,
        notes: port.notes || null,
      }).eq('id', existing.id);
      if (error) return { error: translateError(error) };
    } else {
      const { error } = await supabase.from('switch_ports').insert({
        switch_id: switchId,
        port_number: port.port_number,
        device_type: port.device_type || null,
        device_id: port.device_id || null,
        device_name: port.device_name || null,
        is_active: port.is_active ?? true,
        notes: port.notes || null,
        user_id: user.id,
      });
      if (error) return { error: translateError(error) };
    }
    await fetch();
    return { error: null };
  };

  return { ports, loading, savePort, refetch: fetch };
}
