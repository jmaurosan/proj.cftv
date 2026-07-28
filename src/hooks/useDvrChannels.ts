import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { translateError } from '../lib/errorTranslator';

export interface DvrChannel {
  id?: string;
  dvr_id: string;
  channel_number: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export function useDvrChannels(dvrId: string | null) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<DvrChannel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dvrId || !user) {
      setChannels([]); 
      return; 
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('dvr_channels')
      .select('*')
      .eq('dvr_id', dvrId)
      .eq('user_id', user.id)
      .order('channel_number');
    if (!error) {
      setChannels((data as DvrChannel[]) || []);
    }
    setLoading(false);
  }, [dvrId, user]);

  useEffect(() => { 
    fetch(); 
  }, [fetch]);

  const saveChannel = async (channel: { channel_number: number; is_active?: boolean; notes?: string }) => {
    if (!dvrId) return { error: 'Sem DVR' };
    if (!user) return { error: 'Usuário não autenticado' };
    const { data: existing, error: findError } = await supabase
      .from('dvr_channels')
      .select('id')
      .eq('dvr_id', dvrId)
      .eq('channel_number', channel.channel_number)
      .eq('user_id', user.id)
      .maybeSingle();
    if (findError) return { error: translateError(findError) };

    if (existing) {
      const { error } = await supabase.from('dvr_channels').update({
        is_active: channel.is_active ?? true,
        notes: channel.notes || null,
      }).eq('id', existing.id);
      if (error) return { error: translateError(error) };
    } else {
      const { error } = await supabase.from('dvr_channels').insert({
        dvr_id: dvrId,
        channel_number: channel.channel_number,
        is_active: channel.is_active ?? true,
        notes: channel.notes || null,
        user_id: user.id,
      });
      if (error) return { error: translateError(error) };
    }
    await fetch();
    return { error: null };
  };

  return { channels, loading, saveChannel, refetch: fetch };
}
