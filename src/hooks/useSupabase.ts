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

const AUDIT_MODE = (typeof process !== 'undefined' && (
  process.env?.VITE_AUDIT_MODE === 'true' ||
  process.env?.REACT_APP_AUDIT_MODE === 'true' ||
  process.env?.AUDIT_MODE === 'true'
)) || (typeof window !== 'undefined' && (window as any).__CFTV_AUDIT_MODE === true);

export function useInsertRow<T extends GenericRecord>(table: string) {
  const [loading, setLoading] = useState(false);

  const insert = async (rowData: T) => {
    setLoading(true);
    try {
      if (AUDIT_MODE) {
        console.warn(`[audit] insert blocked for table=${table}`, rowData);
        // In audit mode, don't perform writes. Return a mock result to satisfy callers.
        return [rowData] as unknown as T[];
      }

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
      if (AUDIT_MODE) {
        console.warn(`[audit] update blocked for table=${table} id=${id}`, rowData);
        return null;
      }

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
      if (AUDIT_MODE) {
        console.warn(`[audit] delete blocked for table=${table} id=${id}`);
        return true;
      }

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
