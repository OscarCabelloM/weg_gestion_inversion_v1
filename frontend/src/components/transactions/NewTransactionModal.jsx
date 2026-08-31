import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { todayISO } from '@/lib/formatters';

const MERCADO_OPTIONS = ['NACIONAL', 'INTERNACIONAL', 'CRYPTO'];
const EMPTY_ROWS = [];
const EMPTY_FORM = {
  nemotecnico: '',
  tipo: 'COMPRA',
  mercado: 'NACIONAL',
  cantidad: '',
  precio: '',
  fecha_ing: '',
  notas: '',
};

/**
 * Normaliza lo escrito a formato crudo con punto decimal para el estado.
 * Acepta formato local es-CL ("1.234,56") e internacional ("1234.56").
 * Mantiene el separador decimal en curso para no perder la edición en vivo.
 * Ej: "1.234,56" -> "1234.56" / "128.50" -> "128.50" / "1234," -> "1234.".
 */
function cleanNumeric(text) {
  const cleaned = String(text).replace(/[^\d.,]/g, '');
  if (!cleaned) return '';

  // Formato local: la coma separa decimales y los puntos agrupan miles.
  if (cleaned.includes(',')) {
    const [intRaw, ...decParts] = cleaned.split(',');
    const intPart = (intRaw || '').replace(/\./g, '');
    const decPart = decParts.join('');
    return decPart ? `${intPart || '0'}.${decPart}` : `${intPart || '0'}.`;
  }

  // Sin coma: un único punto con fracción de 1-2 dígitos es decimal
  // ("128.50"); cualquier otro punto se trata como separador de miles.
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount === 1 && /\.\d{1,2}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/\./g, '');
}

/** Muestra el valor crudo con miles '.' y decimales ',' (ej: 1234567.8 -> 1.234.567,8). */
function formatMiles(raw) {
  if (!raw) return '';
  const [intPart, ...decParts] = String(raw).split('.');
  const intFmt = Number(intPart || 0).toLocaleString('es-CL');
  return decParts.length > 0 ? `${intFmt},${decParts.join('')}` : intFmt;
}

/**
 * Modal para registrar una nueva operación o editar una existente.
 * En modo edición, pre-carga los valores del registro y permite
 * guardar cambios o eliminar la operación.
 */
export default function NewTransactionModal({ isOpen, onClose, onSubmit, onDelete, editing, rows = EMPTY_ROWS }) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          nemotecnico: editing.nemotecnico,
          tipo: editing.tipo,
          mercado: editing.mercado || '',
          cantidad: String(editing.cantidad),
          precio: String(editing.precio),
          fecha_ing: editing.fecha_ing,
          notas: editing.notas === '-' ? '' : (editing.notas || ''),
        }
      : { ...EMPTY_FORM, fecha_ing: todayISO() }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Nemotécnicos del catálogo `rows` (tgi_nemotecnico) agrupados por mercado de la
  // misma forma que "Nemotécnicos Existentes": NACIONAL → INTERNACIONAL → CRYPTO →
  // Sin mercado, y alfabético dentro de cada grupo.
  const catalogGroups = useMemo(() => {
    const order = (m) => (m ? MERCADO_OPTIONS.indexOf(m) : MERCADO_OPTIONS.length);
    const grupo = {};
    rows.forEach((r) => {
      const ticker = String(r?.nemotecnico ?? '').trim().toUpperCase();
      if (!ticker) return;
      const clave = r?.mercado || 'Sin mercado';
      (grupo[clave] = grupo[clave] || []).push(ticker);
    });
    return Object.entries(grupo)
      .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
      .map(([mercado, options]) => ({ label: mercado, options: options.sort((a, b) => a.localeCompare(b)) }));
  }, [rows]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'nemotecnico') value = value.toUpperCase();
    if (field === 'mercado') {
      setForm((prev) => ({ ...prev, mercado: value, nemotecnico: editing ? prev.nemotecnico : '' }));
      return;
    }
    if (field === 'cantidad' || field === 'precio') value = cleanNumeric(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.cantidad || !form.precio) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {editing ? (
              <Pencil className="w-4 h-4 text-blue-400" />
            ) : (
              <Plus className="w-4 h-4 text-blue-400" />
            )}
            <span>{editing ? 'Editar Operación' : 'Registrar Nueva Operación'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold" aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-tipo" className="block text-slate-400 mb-1 font-semibold">
                Tipo de Orden
              </label>
              <select
                id="tx-tipo"
                value={form.tipo}
                onChange={handleChange('tipo')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="COMPRA">COMPRA</option>
                <option value="VENTA">VENTA</option>
                <option value="DIVIDENDO">DIVIDENDO</option>
                <option value="COMISION">COMISION</option>
              </select>
            </div>

            <div>
              <label htmlFor="tx-mercado" className="block text-slate-400 mb-1 font-semibold">
                Mercado
              </label>
              <select
                id="tx-mercado"
                value={form.mercado}
                onChange={handleChange('mercado')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold uppercase"
              >
                {MERCADO_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tx-nemotecnico" className="block text-slate-400 mb-1 font-semibold">
              Nemotécnico / Activo
            </label>
            {editing ? (
              <div
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-bold uppercase"
              >
                {form.nemotecnico}
              </div>
            ) : (
                <select
                  id="tx-nemotecnico"
                  required
                  value={form.nemotecnico}
                  onChange={handleChange('nemotecnico')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold uppercase"
                >
                  <option value="" disabled>Selecciona un ticker...</option>
                  {catalogGroups.map((grupo) => (
                    <optgroup key={grupo.label} label={grupo.label}>
                      {grupo.options.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-cantidad" className="block text-slate-400 mb-1 font-semibold">
                Cantidad (Acciones)
              </label>
              <input
                id="tx-cantidad"
                type="text"
                inputMode="decimal"
                required
                placeholder="10"
                value={formatMiles(form.cantidad)}
                onChange={handleChange('cantidad')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="tx-precio" className="block text-slate-400 mb-1 font-semibold">
                Precio por Acción ($)
              </label>
              <input
                id="tx-precio"
                type="text"
                inputMode="decimal"
                required
                placeholder="$185,50"
                value={formatMiles(form.precio)}
                onChange={handleChange('precio')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tx-fecha-ing" className="block text-slate-400 mb-1 font-semibold">
              Fecha de Operación
            </label>
            <input
              id="tx-fecha-ing"
              type="date"
              required
              value={form.fecha_ing}
              onChange={handleChange('fecha_ing')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="tx-notas" className="block text-slate-400 mb-1 font-semibold">
              Notas / Estrategia
            </label>
            <input
              id="tx-notas"
              type="text"
              placeholder="Ej: Rebalanceo trimestral"
              value={form.notas}
              onChange={handleChange('notas')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 font-semibold hover:bg-rose-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 text-slate-950 font-bold hover:bg-blue-400 transition"
            >
              {editing ? 'Guardar Cambios' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmación de eliminación */}
      {confirmDelete && editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">¿Eliminar operación?</h3>
            <p className="text-xs text-slate-400">
              Se eliminará el registro de{' '}
              <span className="font-bold text-white uppercase">{editing.nemotecnico}</span> del{' '}
              {editing.fecha_ing} en la tabla <code className="text-slate-300">tgi_inversiones</code>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onDelete(editing.id)}
                className="px-4 py-2 rounded-lg bg-rose-500 text-slate-950 font-bold hover:bg-rose-400 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
