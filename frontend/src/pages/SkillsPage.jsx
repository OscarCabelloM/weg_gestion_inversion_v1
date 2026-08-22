import { Code, Database, Server, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';
import { EXPRESS_SNIPPET, SUPABASE_SNIPPET } from '@/data/codeSnippets';

/**
 * Tab 5 — Documentación viva: especificación del backend serverless
 * y esquema de base de datos utilizados por el proyecto.
 */
export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Skill & Especificación de Proyecto Backend</h2>
            <p className="text-xs text-slate-400 mt-1">
              Guía de integración completa para React 19 + Vite 8 + Express 5 + Supabase + Yahoo Finance API
              desplegable en Vercel.
            </p>
          </div>
        </div>

        {/* Endpoint Express Serverless */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Endpoint Express Serverless Proxy (api/yahoo.js)</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Node / Express 5</span>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-96 overflow-y-auto scrollbar-none">
            {EXPRESS_SNIPPET}
          </pre>
        </div>

        {/* Esquema Supabase */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Esquema SQL de Base de Datos Supabase (PostgreSQL)</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">PostgreSQL</span>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-96 overflow-y-auto scrollbar-none">
            {SUPABASE_SNIPPET}
          </pre>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-800 pt-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Código fuente real en <code className="text-slate-300 font-mono">api/yahoo.js</code> y{' '}
            <code className="text-slate-300 font-mono">supabase/schema.sql</code>.
          </span>
        </div>
      </Card>
    </div>
  );
}
