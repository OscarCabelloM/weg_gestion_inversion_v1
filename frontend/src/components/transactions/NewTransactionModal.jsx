import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { todayISO } from '@/lib/formatters';

const EMPTY_FORM = {
  nemotecnico: 'AAPL',
  tipo: 'COMPRA',
  cantidad: '',
  precio: '',
  fecha_ing: '',
  notas: '',
};

/**
 * Normaliza lo escrito a formato crudo para el estado: los puntos se
 * consideran separadores de miles (se descartan) y la coma es el decimal.
 * Ej: "1.234,5" -> "1234.5".
 */
function cleanNumeric(text) {
  const cleaned = String(text).replace(/[^\d.,]/g, '');
  const [intRaw, ...decParts] = cleaned.split(',');
  const intPart = (intRaw || '').replace(/\./g, '');
  const decPart = decParts.join('');
  return decPart ? `${intPart || '0'}.${decPart}` : intPart;
}

/** Muestra el valor crudo con miles '.' y decimales ',' (ej: 1234567.8 -> 1.234.567,8). */
function formatMiles(raw) {
  if (!raw) return '';
  const [intPart, ...decParts] = String(raw).split('.');
  const intFmt = Number(intPart || 0).toLocaleString('es-CL');
  return decParts.length > 0 ? `${intFmt},${decParts.join('')}` : intFmt;
}

/**
 * Modal para registrar una nueva operación (compra/venta).
 * El formulario se reinicia cada vez que se abre.
 */
export default function NewTransactionModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, fecha_ing: todayISO() });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'nemotecnico') value = value.toUpperCase();
    else if (field === 'cantidad' || field === 'precio') value = cleanNumeric(value);
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
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Registrar Nueva Operación</span>
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
              <label htmlFor="tx-nemotecnico" className="block text-slate-400 mb-1 font-semibold">
                Ticker / Activo
              </label>
              <input
                id="tx-nemotecnico"
                type="text"
                required
                placeholder="Ej: AAPL, BTC-USD"
                value={form.nemotecnico}
                onChange={handleChange('nemotecnico')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold uppercase"
              />
            </div>
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
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
