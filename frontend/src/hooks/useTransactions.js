import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_TRANSACTIONS } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';

/**
 * Diario de inversiones. Si Supabase está configurado persiste en
 * PostgreSQL (tabla `tgi_inversiones` con RLS ligada a auth.uid()); en caso
 * contrario opera en modo local con datos simulados.
 */
export function useTransactions() {
  const { user, isAuthRequired } = useAuth();
  const userId = user?.id ?? null;
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);

  // Carga (y recarga) al iniciar sesión / cambiar de usuario
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;

    let cancelled = false;

    supabase
      .from('tgi_inversiones')
      .select('*')
      .order('fecha_ing', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[supabase] No se pudieron cargar transacciones:', error.message);
          return;
        }
        // Sustituye los datos simulados por los reales del usuario (aunque estén vacíos)
        setTransactions(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addTransaction = useCallback(
    async ({ nemotecnico, tipo, cantidad, precio, fecha_ing, notas }) => {
      const payload = {
        nemotecnico: nemotecnico.toUpperCase(),
        tipo,
        cantidad: parseFloat(cantidad),
        precio: parseFloat(precio),
        fecha_ing,
        notas: notas || '-',
      };

      if (isSupabaseConfigured && userId) {
        const { data, error } = await supabase
          .from('tgi_inversiones')
          .insert({ ...payload, user_id: userId })
          .select()
          .single();

        if (!error && data) {
          setTransactions((prev) => [data, ...prev]);
          return data;
        }
        console.warn('[supabase] Insert falló, guardando solo en memoria:', error?.message);
      }

      const created = { ...payload, id: `tx-${Date.now()}` };
      setTransactions((prev) => [created, ...prev]);
      return created;
    },
    [userId]
  );

  const removeTransaction = useCallback(
    async (id) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (isSupabaseConfigured && userId && !String(id).startsWith('tx-')) {
        const { error } = await supabase.from('tgi_inversiones').delete().eq('id', id);
        if (error) console.warn('[supabase] Delete falló:', error.message);
      }
    },
    [userId]
  );

  return {
    transactions,
    addTransaction,
    removeTransaction,
    isLocalMode: !isAuthRequired,
  };
}
