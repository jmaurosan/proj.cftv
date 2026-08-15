import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type GenericRecord = object;

export function useFetchTable<T extends GenericRecord>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error: supabaseError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setData((result as T[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useInsertRow<T extends GenericRecord>(table: string) {
  const [loading, setLoading] = useState(false);

  const insert = async (rowData: T) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert([rowData]).select();
      if (error) throw error;
      return data as T[] | null;
    } finally {
      setLoading(false);
    }
  };

  return { insert, loading };
}

export function useUpdateRow<T extends GenericRecord>(table: string) {
  const [loading, setLoading] = useState(false);

  const update = async (id: string, rowData: Partial<T> & object) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).update(rowData as Record<string, unknown>).eq('id', id).select();
      if (error) throw error;
      return data as T[] | null;
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

      await supabase.from('activity_logs').insert([
        {
          type: 'warning',
          message: `Equipamento ${name || id} removido do inventário de ${table.toUpperCase()}.`,
          location: 'SISTEMA',
        },
      ]);

      return true;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
}
