import { useEffect, useState } from 'react';
import { ListPlus, Pencil, Plus, Trash2, X } from 'lucide-react';

/**
 * Modal de gestión del catálogo de nemotécnicos (`tgi_nemotecnico`).
 * Permite agregar, modificar y eliminar tickers.
 */
export default function ManageNemotecnicosModal({
  isOpen,
  onClose,
  rows = [],
  loaded = true,
  loadError = '',
  onAdd,
  onUpdate,
  onDelete,
}) {
  const [mode, setMode] = useState(null); // null | { id, nemotecnico }
  const [value, setValue] = useState('');
  const [toDelete, setToDelete] = useState(null); // { id, nemotecnico } | null
  const [toast, setToast] = useState(null); // { message, type: 'ok' | 'error' }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!isOpen) return null;

  const startEdit = (row) => {
    setMode({ id: row.id, nemotecnico: row.nemotecnico });
    setValue(row.nemotecnico);
  };

  const startAdd = () => {
    setMode({ id: null, nemotecnico: '' });
    setValue('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;
    const result = mode?.id ? await onUpdate(mode.id, normalized) : await onAdd(normalized);
    if (!result?.ok) {
      setToast({ message: result?.error || 'No se pudo guardar el nemotécnico.', type: 'error' });
      return;
    }
    setToast({
      message: mode?.id
        ? `Nemotécnico ${normalized} modificado correctamente`
        : `Nemotécnico ${normalized} agregado correctamente`,
      type: 'ok',
    });
    setMode(null);
    setValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border transition-opacity ${
            toast.type === 'error'
              ? 'bg-rose-500/90 text-slate-950 border-rose-400'
              : 'bg-blue-500/90 text-slate-950 border-blue-400'
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-blue-400" />
            <span>Nemotécnico</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold" aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        {/* Formulario agregar / editar */}
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label htmlFor="ntx-value" className="block text-slate-400 mb-1 font-semibold">
              {mode?.id ? 'Modificar Nemotécnico' : 'Agregar Nemotécnico'}
            </label>
            <div className="flex gap-2">
              <input
                id="ntx-value"
                type="text"
                required
                placeholder="Ej: AAPL, QUINENCO.SN"
                value={value}
                onChange={(e) => setValue(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold uppercase"
              />
              {mode?.id ? (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-500 text-slate-950 font-bold hover:bg-blue-400 transition flex items-center gap-1.5"
                >
                  <Pencil className="w-4 h-4" />
                  Guardar
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-500 text-slate-950 font-bold hover:bg-blue-400 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              )}
            </div>
          </div>
          {mode?.id && (
            <button
              type="button"
              onClick={() => { setMode(null); setValue(''); }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition"
            >
              Cancelar edición
            </button>
          )}
        </form>

        {/* Listado */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 tracking-wider mb-1.5">
            Nemotécnicos Existentes
          </h4>
          <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60">
            {!loaded ? (
              <p className="p-6 text-center text-slate-500 text-sm">Cargando nemotécnicos...</p>
            ) : loadError ? (
              <p className="p-6 text-center text-rose-400 text-xs">
                No se pudieron cargar los nemotécnicos. Intenta nuevamente.
              </p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-center text-slate-500 text-sm">
                No hay nemotécnicos registrados.
              </p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-800/40 transition">
                  <span className="text-xs font-semibold text-white uppercase">{row.nemotecnico}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(row)}
                      className="text-slate-400 hover:text-blue-400 p-1.5 transition"
                      title={`Editar ${row.nemotecnico}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(row)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 transition"
                      title={`Eliminar ${row.nemotecnico}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        {/* Confirmación de eliminación */}
        {toDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">¿Eliminar nemotécnico?</h3>
              <p className="text-xs text-slate-400">
                Se eliminará <span className="font-bold text-white uppercase">{toDelete.nemotecnico}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setToast({ message: `Nemotécnico ${toDelete.nemotecnico} eliminado`, type: 'ok' });
                    await onDelete(toDelete.id);
                    setToDelete(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-500 text-slate-950 font-bold hover:bg-rose-400 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
