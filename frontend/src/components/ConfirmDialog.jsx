import { useEffect, useRef } from 'react';
import { Boton } from './Boton.jsx';
import { Icono } from './Icono.jsx';

export function ConfirmDialog({
  abierto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
  cargando = false,
  variante = 'primario',
}) {
  const botonRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    const alPresionar = (evento) => {
      if (evento.key === 'Escape' && !cargando) onCancelar();
    };

    document.addEventListener('keydown', alPresionar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto, cargando, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="modal-fondo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !cargando) onCancelar();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
        <div className="modal__cabecera">
          <span className="modal__icono" aria-hidden="true">
            <Icono nombre="alerta" tamano={22} />
          </span>
          <h2 className="modal__titulo" id="titulo-modal">
            {titulo}
          </h2>
          <button
            type="button"
            className="modal__cerrar"
            onClick={onCancelar}
            aria-label="Cerrar"
            disabled={cargando}
          >
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>
        <div className="modal__cuerpo">{children}</div>
        <div className="modal__acciones">
          <Boton variante="secundario" onClick={onCancelar} disabled={cargando}>
            {textoCancelar}
          </Boton>
          <Boton
            ref={botonRef}
            variante={variante}
            onClick={onConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
