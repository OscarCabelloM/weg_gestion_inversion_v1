import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_MARKET_DATA } from '@/data/mockData';

/**
 * Gestión de la tabla `tgi_nemotecnico` (catálogo de tickers).
 * En modo local (sin Supabase) construye el listado desde los datos
 * de mercado simulados y las operaciones registradas; las mutaciones
 * solo afectan el estado en memoria.
 */
export function useNemotecnicos(transactions = []) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    supabase
      .from('tgi_nemotecnico')
      .select('id, nemotecnico')
      .order('nemotecnico', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setRows(data);
        }
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nemotecnicos = useMemo(() => {
    const base = isSupabaseConfigured
      ? rows.map((r) => r.nemotecnico)
      : Object.keys(MOCK_MARKET_DATA);
    const txs = transactions.map((t) => String(t?.nemotecnico ?? '').trim()).filter(Boolean);
    return [...new Set([...base, ...txs])].sort((a, b) => a.localeCompare(b));
  }, [isSupabaseConfigured, rows, transactions]);

  const addNemotecnico = useCallback(
    async (nemotecnico) => {
      const value = String(nemotecnico).trim().toUpperCase();
      if (!value) return { ok: false, error: 'Nemotécnico vacío.' };
      if (nemotecnicos.includes(value)) return { ok: false, error: `El nemotécnico ${value} ya existe.` };

      if (isSupabaseConfigured) {
        // user_id NO se envía: DEFAULT auth.uid() + RLS garantizan la propiedad.
        const { data, error } = await supabase
          .from('tgi_nemotecnico')
          .insert({ nemotecnico: value })
          .select('id, nemotecnico')
          .single();
        if (error) {
          console.warn('[supabase] Insert tgi_nemotecnico falló:', error.message);
          return { ok: false, error: error.message };
        }
        if (data) {
          setRows((prev) => [...prev, data].sort((a, b) => a.nemotecnico.localeCompare(b.nemotecnico)));
          return { ok: true, data };
        }
      }

      const created = { id: `ntx-${Date.now()}`, nemotecnico: value };
      setRows((prev) => [...prev, created].sort((a, b) => a.nemotecnico.localeCompare(b.nemotecnico)));
      return { ok: true, data: created };
    },
    [isSupabaseConfigured, nemotecnicos]
  );

  const updateNemotecnico = useCallback(
    async (id, nemotecnico) => {
      const value = String(nemotecnico).trim().toUpperCase();
      if (!value) return { ok: false, error: 'Nemotécnico vacío.' };

      if (isSupabaseConfigured && !String(id).startsWith('ntx-')) {
        const { error } = await supabase
          .from('tgi_nemotecnico')
          .update({ nemotecnico: value })
          .eq('id', id);
        if (error) {
          console.warn('[supabase] Update tgi_nemotecnico falló:', error.message);
          return { ok: false, error: error.message };
        }
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, nemotecnico: value } : r)));
      return { ok: true };
    },
    [isSupabaseConfigured]
  );

  const removeNemotecnico = useCallback(
    async (id) => {
      if (isSupabaseConfigured && !String(id).startsWith('ntx-')) {
        const { error } = await supabase.from('tgi_nemotecnico').delete().eq('id', id);
        if (error) {
          console.warn('[supabase] Delete tgi_nemotecnico falló:', error.message);
          return { ok: false, error: error.message };
        }
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      return { ok: true };
    },
    [isSupabaseConfigured]
  );

  return {
    nemotecnicos,
    rows,
    loaded,
    addNemotecnico,
    updateNemotecnico,
    removeNemotecnico,
  };
}
