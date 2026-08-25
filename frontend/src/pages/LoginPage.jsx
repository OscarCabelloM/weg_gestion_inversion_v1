import { useState } from 'react';
import { Activity, LineChart, Loader2, Lock, LogIn, Mail, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Traduce los errores más comunes de Supabase Auth a mensajes claros. */
const AUTH_ERRORS = [
  ['invalid login credentials', 'Correo o contraseña incorrectos.'],
  ['email not confirmed', 'Debes confirmar tu correo antes de iniciar sesión.'],
  ['user already registered', 'Este correo ya está registrado. Inicia sesión.'],
  ['rate limit', 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
  ['unable to validate email', 'El formato del correo no es válido.'],
];

function translateAuthError(message = '') {
  const match = AUTH_ERRORS.find(([key]) => message.toLowerCase().includes(key));
  return match ? match[1] : 'No se pudo completar la operación. Inténtalo de nuevo.';
}

const FEATURES = [
  { icon: LineChart, text: 'Cotizaciones en vivo desde Yahoo Finance' },
  { icon: Wallet, text: 'Diario de compras y ventas con P&L automático' },
  { icon: TrendingUp, text: 'Rendimiento mensual y anual del portafolio' },
];

export default function LoginPage() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await signUp({ email, password });
        if (signUpError) throw signUpError;

        // Si la confirmación por email está activa, aún no hay sesión
        if (data?.user && !data.session) {
          setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
          switchMode('signin');
          return;
        }
      } else {
        const { error: signInError } = await signIn({ email, password });
        if (signInError) throw signInError;
        // La sesión se propaga vía onAuthStateChange
      }
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-blue-500 selection:text-slate-950">
      {/* Panel de marca */}
      <aside className="hidden lg:flex flex-col justify-between w-2/5 max-w-lg p-10 border-r border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Gestión_Inversiones.v.1.2.3</h1>
            <p className="text-xs text-blue-400 font-mono">Dashboard de Inversiones</p>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-black leading-tight text-white">
            Tu portafolio,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              bajo control total.
            </span>
          </h2>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-slate-500">Datos de mercado en tiempo real · Supabase + Vercel</p>
      </aside>

      {/* Formulario */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Logo compacto para móvil */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-slate-950">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h1 className="text-lg font-bold text-white">Gestión_Inversiones.v.1.2.3</h1>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">
              {mode === 'signin' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Accede a tu portafolio de inversiones.'
                : 'Empieza a gestionar tus inversiones en minutos.'}
            </p>
          </div>

          {/* Selector de modo */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {[
              { id: 'signin', label: 'Iniciar Sesión', icon: LogIn },
              { id: 'signup', label: 'Registrarse', icon: UserPlus },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchMode(tab.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs font-medium p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-slate-950 text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : mode === 'signin' ? (
                'Entrar al Dashboard'
              ) : (
                'Crear Cuenta Gratis'
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-500">
            Protegido con Supabase Auth · Tus datos son privados (RLS)
          </p>
        </div>
      </main>
    </div>
  );
}
