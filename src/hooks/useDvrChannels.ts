import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface DvrChannel {
  id?: string;
  dvr_id: string;
  channel_number: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export function useDvrChannels(dvrId: string | null) {
  const [channels, setChannels] = useState<DvrChannel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dvrId) { 
      setChannels([]); 
      return; 
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('dvr_channels')
      .select('*')
      .eq('dvr_id', dvrId)
      .order('channel_number');
    if (!error) {
      setChannels((data as DvrChannel[]) || []);
    }
    setLoading(false);
  }, [dvrId]);

  useEffect(() => { 
    fetch(); 
  }, [fetch]);

  const saveChannel = async (channel: { channel_number: number; is_active?: boolean; notes?: string }) => {
    if (!dvrId) return { error: 'Sem DVR' };
    const { data: existing } = await supabase
      .from('dvr_channels')
      .select('id')
      .eq('dvr_id', dvrId)
      .eq('channel_number', channel.channel_number)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('dvr_channels').update({
        is_active: channel.is_active ?? true,
        notes: channel.notes || null,
      }).eq('id', existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from('dvr_channels').insert({
        dvr_id: dvrId,
        channel_number: channel.channel_number,
        is_active: channel.is_active ?? true,
        notes: channel.notes || null,
      });
      if (error) return { error: error.message };
    }
    await fetch();
    return { error: null };
  };

  return { channels, loading, saveChannel, refetch: fetch };
}
