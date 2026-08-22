/**
 * Panel contenedor estándar de la aplicación (fondo oscuro, borde y radios).
 * Permite título opcional con icono y una zona de acciones a la derecha.
 */
export default function Card({
  title,
  icon: Icon,
  iconClassName = 'text-emerald-400',
  actions,
  children,
  className = '',
}) {
  return (
    <section className={`rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 ${iconClassName}`} />}
              <span>{title}</span>
            </h3>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
