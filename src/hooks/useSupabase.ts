import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useFetchTable<T>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error: supabaseError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setData(result || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [table]);

  return { data, loading, error, refresh: fetchData };
}

export function useInsertRow(table: string) {
  const [loading, setLoading] = useState(false);

  const insert = async (rowData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert([rowData]).select();
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { insert, loading };
}

export function useUpdateRow(table: string) {
  const [loading, setLoading] = useState(false);

  const update = async (id: string, rowData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).update(rowData).eq('id', id).select();
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
}

export function useDeleteRow(table: string) {
  const [loading, setLoading] = useState(false);

  const remove = async (id: string, name?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      // Gravar log de exclusão
      await supabase.from('activity_logs').insert([{
        type: 'warning',
        message: `Equipamento ${name || id} removido do inventário de ${table.toUpperCase()}.`,
        location: 'SISTEMA'
      }]);

      return true;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
}
