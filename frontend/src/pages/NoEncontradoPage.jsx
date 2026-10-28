import { Link } from 'react-router-dom';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';

export function NoEncontradoPage() {
  useTituloPagina('Página no encontrada');

  return (
    <div className="contenedor pagina pagina--estrecha">
      <EstadoVacio
        icono="buscar"
        titulo="Esta página no existe"
        mensaje="El enlace puede estar incompleto o la página fue movida. Regrese al inicio o consulte el catálogo."
        accion={
          <div className="acciones-en-linea">
            <Link className="boton boton--primario" to="/">
              <Icono nombre="inicio" tamano={18} />
              <span>Ir al inicio</span>
            </Link>
            <Link className="boton boton--secundario" to="/catalogo">
              <Icono nombre="catalogo" tamano={18} />
              <span>Ver catálogo</span>
            </Link>
          </div>
        }
      />
    </div>
  );
}
