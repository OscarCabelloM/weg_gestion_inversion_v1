import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { todayISO } from '@/lib/formatters';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Selector de fecha desplegable con calendario propio (tema oscuro).
 * Muestra el valor en formato es-CL (DD/MM/AAAA) y despliega un calendario
 * con navegación de meses al hacer clic.
 */
export default function DatePicker({ id, value = '', onChange }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const today = todayISO();

  // Cierra el calendario al hacer clic fuera del componente o pulsar Escape
  // (Escape además devuelve el foco al botón disparador).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Al abrir, posiciona el calendario en el mes del valor actual.
  useEffect(() => {
    if (!open || !value) return;
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open, value]);

  const cells = useMemo(() => {
    // Primer día de la semana = lunes.
    const first = new Date(view.year, view.month, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < lead; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    return list;
  }, [view]);

  const display = value ? (() => {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  })() : '';

  const changeMonth = (delta) => {
    let month = view.month + delta;
    let year = view.year;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setView({ year, month });
  };

  const selectDate = (day) => {
    onChange(`${view.year}-${pad(view.month + 1)}-${pad(day)}`);
    setOpen(false);
  };

  const isSelected = (day) => value === `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
  const isToday = (day) => today === `${view.year}-${pad(view.month + 1)}-${pad(day)}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={display ? 'font-bold tabular-nums' : 'text-slate-500'}>{display || 'Selecciona una fecha...'}</span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Selector de fecha"
          className="absolute z-[70] mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white">
              {MONTHS[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) =>
              day == null ? (
                <span key={`x-${i}`} />
              ) : (
                <button
                  key={`${view.year}-${view.month}-${day}`}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-8 rounded-md text-xs font-semibold transition-colors ${
                    isSelected(day)
                      ? 'bg-blue-500 text-slate-950 font-bold'
                      : isToday(day)
                        ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
                        : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
