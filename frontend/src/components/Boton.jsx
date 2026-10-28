import { Icono } from './Icono.jsx';

export function Boton({
  children,
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  icono = null,
  className = '',
  type = 'button',
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      className={`boton boton--${variante} boton--${tamano} ${className}`.trim()}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando ? (
        <span className="spinner" aria-hidden="true" />
      ) : icono ? (
        <Icono nombre={icono} tamano={18} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
