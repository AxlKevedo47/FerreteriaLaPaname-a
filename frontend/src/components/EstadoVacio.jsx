import { Icono } from './Icono.jsx';

export function EstadoVacio({ icono = 'buscar', titulo, mensaje, accion = null }) {
  return (
    <div className="estado-vacio">
      <span className="estado-vacio__icono" aria-hidden="true">
        <Icono nombre={icono} tamano={30} />
      </span>
      <h3 className="estado-vacio__titulo">{titulo}</h3>
      <p className="estado-vacio__mensaje">{mensaje}</p>
      {accion && <div className="estado-vacio__accion">{accion}</div>}
    </div>
  );
}
