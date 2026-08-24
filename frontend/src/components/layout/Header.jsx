import { Activity, LogOut, Plus, RefreshCw } from 'lucide-react';
import { TABS } from '@/constants/navigation';

export default function Header({ activeTab, onTabChange, onSync, isSyncing, onNewTransaction, user, onSignOut }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Marca */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Gestión_Inversiones.v.1.2</h1>
          </div>
        </div>

        {/* Acciones globales */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar cotizaciones desde Yahoo Finance API"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sincronizar Yahoo</span>
          </button>

          <button
            onClick={onNewTransaction}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nueva Operación</span>
          </button>

          {/* Sesión de usuario */}
          {user && (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
              <div
                className="hidden md:flex flex-col items-end max-w-[160px]"
                title={`Sesión activa: ${user.email}`}
              >
                <span className="text-[11px] font-semibold text-slate-300 truncate w-full text-right">
                  {user.email}
                </span>
                <button
                  onClick={onSignOut}
                  className="text-[10px] font-medium text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
              <button
                onClick={onSignOut}
                title={`Cerrar sesión (${user.email})`}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-500/15 border border-slate-700 hover:border-rose-500/30 transition-all active:scale-95 shrink-0"
              >
                <LogOut className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegación por pestañas */}
      <nav className="border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
