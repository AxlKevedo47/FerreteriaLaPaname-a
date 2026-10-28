import { useId } from 'react';
import { Icono } from './Icono.jsx';

export function BarraBusqueda({
  valor,
  onCambiar,
  onEnviar,
  placeholder = 'Buscar por nombre o código…',
  textoBoton = 'Buscar',
  autoFocus = false,
  className = '',
  id = undefined,
}) {
  const idGenerado = useId();
  const idInput = id ?? `busqueda-${idGenerado}`;

  return (
    <form
      className={`barra-busqueda ${className}`.trim()}
      role="search"
      onSubmit={(evento) => {
        evento.preventDefault();
        onEnviar(valor);
      }}
    >
      <label className="visualmente-oculto" htmlFor={idInput}>
        Buscar productos
      </label>
      <span className="barra-busqueda__icono" aria-hidden="true">
        <Icono nombre="buscar" tamano={20} />
      </span>
      <input
        id={idInput}
        className="barra-busqueda__input"
        type="search"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck="false"
      />
      {valor && (
        <button
          type="button"
          className="barra-busqueda__limpiar"
          onClick={() => onCambiar('')}
          aria-label="Limpiar búsqueda"
        >
          <Icono nombre="cerrar" tamano={16} />
        </button>
      )}
      <button type="submit" className="boton boton--primario barra-busqueda__boton">
        <Icono nombre="buscar" tamano={18} />
        <span>{textoBoton}</span>
      </button>
    </form>
  );
}
