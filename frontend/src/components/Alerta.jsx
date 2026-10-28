import { Icono } from './Icono.jsx';

const CONFIGURACION = {
  info: { icono: 'info', clase: 'alerta--info' },
  exito: { icono: 'checkCirculo', clase: 'alerta--exito' },
  error: { icono: 'alerta', clase: 'alerta--error' },
  advertencia: { icono: 'alerta', clase: 'alerta--advertencia' },
};

export function Alerta({ tipo = 'info', titulo, children, accion = null }) {
  const configuracion = CONFIGURACION[tipo] ?? CONFIGURACION.info;
  return (
    <div className={`alerta ${configuracion.clase}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <span className="alerta__icono" aria-hidden="true">
        <Icono nombre={configuracion.icono} tamano={20} />
      </span>
      <div className="alerta__contenido">
        {titulo && <p className="alerta__titulo">{titulo}</p>}
        <div className="alerta__texto">{children}</div>
      </div>
      {accion && <div className="alerta__accion">{accion}</div>}
    </div>
  );
}
