import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Gestión de la tabla `tgi_nemotecnico` (catálogo de tickers).
 * El listado proviene del catálogo `rows` (Supabase); las mutaciones
 * solo afectan el estado real.
 */
export function useNemotecnicos(userId = null) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    if (!isSupabaseConfigured) {
      setRows([]);
      setLoaded(true);
      setLoadError('');
      return;
    }
    supabase
      .from('tgi_nemotecnico')
      .select('id, nemotecnico, mercado')
      .order('nemotecnico', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[supabase] Select tgi_nemotecnico falló:', error.message);
          setLoadError(error.message);
          setRows([]);
        } else {
          setRows(data ?? []);
          setLoadError('');
        }
        setLoaded(true);
      });
  }, []);

  // Recarga el catálogo al iniciar sesión / cambiar de usuario (RLS liga a auth.uid()).
  // Sin Supabase (modo local) no hay catálogo: marca como cargado para no dejar el modal en "Cargando...".
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRows([]);
      setLoaded(true);
      setLoadError('');
      return;
    }
    if (!userId) return;
    setLoaded(false);
    load();
  }, [userId, load]);

  const addNemotecnico = useCallback(
    async (nemotecnico, mercado = '') => {
      const value = String(nemotecnico).trim().toUpperCase();
      if (!value) return { ok: false, error: 'Nemotécnico vacío.' };
      const mercadoValue = String(mercado ?? '').trim() || null;
      // Chequeo de duplicado SOLO contra el catálogo real (`rows`): un nemotécnico
      // borrado del catálogo puede seguir en operaciones y no debe bloquear el alta.
      if (rows.some((r) => String(r.nemotecnico).toUpperCase() === value))
        return { ok: false, error: `El nemotécnico ${value} ya existe.` };

      if (isSupabaseConfigured) {
        // user_id NO se envía: DEFAULT auth.uid() + RLS garantizan la propiedad.
        const { data, error } = await supabase
          .from('tgi_nemotecnico')
          .insert({ nemotecnico: value, mercado: mercadoValue })
          .select('id, nemotecnico, mercado')
          .single();
        if (!error && data) {
          load();
          return { ok: true, data };
        }
        // Si el persistido falla (p. ej. RLS no aplicada), se conserva en memoria
        // para que el catálogo siga siendo utilizable en esta sesión.
        console.warn('[supabase] Insert tgi_nemotecnico falló, guardando solo en memoria:', error?.message);
      }

      const created = { id: `ntx-${Date.now()}`, nemotecnico: value, mercado: mercadoValue };
      setRows((prev) => [...prev, created].sort((a, b) => a.nemotecnico.localeCompare(b.nemotecnico)));
      return { ok: true, data: created };
    },
    [rows, load]
  );

  const updateNemotecnico = useCallback(
    async (id, nemotecnico, mercado = '') => {
      const value = String(nemotecnico).trim().toUpperCase();
      if (!value) return { ok: false, error: 'Nemotécnico vacío.' };
      const mercadoValue = String(mercado ?? '').trim() || null;

      if (isSupabaseConfigured && !String(id).startsWith('ntx-')) {
        const { error } = await supabase
          .from('tgi_nemotecnico')
          .update({ nemotecnico: value, mercado: mercadoValue })
          .eq('id', id);
        if (error) {
          console.warn('[supabase] Update tgi_nemotecnico falló:', error.message);
          return { ok: false, error: error.message };
        }
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, nemotecnico: value, mercado: mercadoValue } : r)));
      load();
      return { ok: true };
    },
    [load]
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
      load();
      return { ok: true };
    },
    [load]
  );

  return {
    rows,
    loaded,
    loadError,
    load,
    addNemotecnico,
    updateNemotecnico,
    removeNemotecnico,
  };
}
