export function Campo({
  etiqueta,
  htmlFor,
  requerido = false,
  ayuda,
  error,
  children,
  className = '',
}) {
  return (
    <div className={`campo ${className}`.trim()}>
      <label className="campo__etiqueta" htmlFor={htmlFor}>
        {etiqueta}
        {requerido && (
          <span className="campo__requerido" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {ayuda && !error && <p className="campo__ayuda">{ayuda}</p>}
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
