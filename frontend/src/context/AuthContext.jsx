import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured, onAuthStateChange } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

/**
 * Proveedor global de autenticación.
 * - Si Supabase está configurado: gestiona sesión real (login, registro, logout).
 * - Si no lo está (`isAuthRequired === false`): la app corre en modo local sin login.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;

    // Restaura sesión existente (token en localStorage). Si falla (p. ej. sesión
    // corrupta), se limpia la sesión y se desbloquea la UI en vez de quedarse
    // colgada en "Restaurando sesión...".
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setIsLoading(false);
    });

    // Escucha login / logout / refresh de token
    const unsubscribe = onAuthStateChange((_event, newSession) => setSession(newSession));

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isAuthRequired: isSupabaseConfigured,
      isLoading,

      async signIn({ email, password }) {
        return supabase.auth.signInWithPassword({ email, password });
      },

      async signUp({ email, password }) {
        return supabase.auth.signUp({ email, password });
      },

      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
