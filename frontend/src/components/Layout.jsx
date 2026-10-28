import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icono } from './Icono.jsx';

const ENLACES = [
  { ruta: '/', texto: 'Inicio', icono: 'inicio', exacto: true },
  { ruta: '/catalogo', texto: 'Catálogo', icono: 'catalogo' },
  { ruta: '/buscar', texto: 'Buscar', icono: 'buscar' },
  { ruta: '/registrar', texto: 'Registrar', icono: 'registrar' },
];

function ScrollAlInicio() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function Layout({ children }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();

  useEffect(() => {
    setMenuAbierto(false);
  }, [ubicacion.pathname, ubicacion.search]);

  return (
    <div className="aplicacion">
      <ScrollAlInicio />
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>

      <header className="encabezado">
        <div className="contenedor encabezado__interior">
          <Link className="marca" to="/" aria-label="Ferretería La Panameña, ir al inicio">
            <span className="marca__simbolo" aria-hidden="true">
              <Icono nombre="herramienta" tamano={22} />
            </span>
            <span className="marca__texto">
              <span className="marca__nombre">Ferretería La Panameña</span>
              <span className="marca__detalle">Catálogo de productos</span>
            </span>
          </Link>

          <button
            type="button"
            className="menu-boton"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-controls="navegacion-principal"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} tamano={24} />
          </button>

          <nav
            id="navegacion-principal"
            className={`navegacion ${menuAbierto ? 'navegacion--abierta' : ''}`}
            aria-label="Navegación principal"
          >
            <div className="navegacion__enlaces">
              {ENLACES.map((enlace) => (
                <NavLink
                  key={enlace.ruta}
                  to={enlace.ruta}
                  end={enlace.exacto}
                  className={({ isActive }) =>
                    `navegacion__enlace ${isActive ? 'navegacion__enlace--activo' : ''}`
                  }
                >
                  <Icono nombre={enlace.icono} tamano={18} />
                  {enlace.texto}
                </NavLink>
              ))}
            </div>
            <NavLink
              to="/respaldos"
              className={({ isActive }) =>
                `navegacion__respaldo ${isActive ? 'navegacion__respaldo--activo' : ''}`
              }
            >
              <Icono nombre="respaldo" tamano={18} />
              Respaldos
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="contenido" className="contenido">
        {children}
      </main>

      <footer className="pie">
        <div className="contenedor pie__interior">
          <div>
            <p className="pie__titulo">Ferretería La Panameña</p>
            <p className="pie__texto">
              Catálogo local de productos · React, Node.js y PostgreSQL
            </p>
          </div>
          <p className="pie__nota">
            <span className="punto-verde" aria-hidden="true" />
            Uso local, sin inicio de sesión
          </p>
        </div>
      </footer>
    </div>
  );
}
