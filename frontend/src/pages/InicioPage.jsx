import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { BarraBusqueda } from '../components/BarraBusqueda.jsx';
import { Boton } from '../components/Boton.jsx';
import { Cargando } from '../components/Cargando.jsx';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { TablaProductos } from '../components/TablaProductos.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';

const ACCIONES = [
  {
    ruta: '/registrar',
    icono: 'registrar',
    titulo: 'Registrar producto',
    descripcion: 'Agregue un producto nuevo con su categoría, unidad y presentaciones de venta.',
    texto: 'Abrir formulario',
  },
  {
    ruta: '/catalogo',
    icono: 'catalogo',
    titulo: 'Consultar catálogo',
    descripcion: 'Explore todos los productos, filtre por categoría y revise la información detallada.',
    texto: 'Ver catálogo',
  },
  {
    ruta: '/respaldos',
    icono: 'respaldo',
    titulo: 'Respaldar información',
    descripcion: 'Genere una copia real de la base de datos y descárguela para conservarla segura.',
    texto: 'Gestionar respaldos',
  },
];

export function InicioPage() {
  useTituloPagina(null);
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [resumen, setResumen] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    Promise.all([api.obtenerResumen(), api.listarProductos({ porPagina: 5, orden: 'reciente' })])
      .then(([respuestaResumen, respuestaProductos]) => {
        if (!activo) return;
        setResumen(respuestaResumen.datos);
        setRecientes(respuestaProductos.datos);
      })
      .catch((fallo) => {
        if (activo) setError(fallo);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [recarga]);

  function buscar(valor) {
    const limpio = valor.trim();
    navegar(limpio ? `/buscar?q=${encodeURIComponent(limpio)}` : '/buscar');
  }

  return (
    <>
      <section className="heroe">
        <div className="contenedor heroe__interior">
          <div className="heroe__contenido">
            <span className="heroe__eyebrow">
              <Icono nombre="etiqueta" tamano={16} />
              Catálogo centralizado
            </span>
            <h1 className="heroe__titulo">
              Todo el catálogo de la ferretería, <span>en un solo lugar.</span>
            </h1>
            <p className="heroe__descripcion">
              Registre, organice y encuentre productos de forma rápida. La información se guarda
              en PostgreSQL y queda disponible para todo el equipo local.
            </p>

            <BarraBusqueda
              valor={texto}
              onCambiar={setTexto}
              onEnviar={buscar}
              placeholder="Buscar por nombre o código…"
              className="barra-busqueda--heroe"
            />

            <p className="heroe__ayuda">
              La búsqueda no distingue mayúsculas, minúsculas ni tildes.
            </p>
          </div>

          <aside className="panel-resumen" aria-label="Resumen del catálogo">
            <p className="panel-resumen__titulo">Resumen del catálogo</p>
            <div className="panel-resumen__principal">
              <span className="panel-resumen__numero">
                {cargando && !resumen ? '—' : resumen?.total ?? '—'}
              </span>
              <span className="panel-resumen__unidad">productos registrados</span>
            </div>
            <dl className="panel-resumen__lista">
              <div>
                <dt>Categorías</dt>
                <dd>{cargando && !resumen ? '—' : resumen?.categorias ?? '—'}</dd>
              </div>
              <div>
                <dt>Productos fraccionados</dt>
                <dd>{cargando && !resumen ? '—' : resumen?.fraccionados ?? '—'}</dd>
              </div>
              <div>
                <dt>Productos activos</dt>
                <dd>{cargando && !resumen ? '—' : resumen?.activos ?? '—'}</dd>
              </div>
            </dl>
            <Link className="panel-resumen__enlace" to="/catalogo">
              Explorar el catálogo
              <Icono nombre="flechaDerecha" tamano={17} />
            </Link>
          </aside>
        </div>
      </section>

      <div className="contenedor pagina">
        {error && (
          <Alerta
            tipo="error"
            titulo="No se pudo cargar la información"
            accion={
              <Boton variante="secundario" tamano="sm" icono="recargar" onClick={() => setRecarga((n) => n + 1)}>
                Reintentar
              </Boton>
            }
          >
            {error.message}
          </Alerta>
        )}

        <section className="seccion" aria-labelledby="titulo-acciones">
          <div className="seccion__cabecera">
            <div>
              <p className="seccion__eyebrow">Accesos rápidos</p>
              <h2 className="seccion__titulo" id="titulo-acciones">
                ¿Qué necesita hacer?
              </h2>
            </div>
          </div>

          <div className="rejilla-acciones">
            {ACCIONES.map((accion) => (
              <Link key={accion.ruta} className="tarjeta-accion" to={accion.ruta}>
                <span className="tarjeta-accion__icono" aria-hidden="true">
                  <Icono nombre={accion.icono} tamano={24} />
                </span>
                <h3 className="tarjeta-accion__titulo">{accion.titulo}</h3>
                <p className="tarjeta-accion__descripcion">{accion.descripcion}</p>
                <span className="tarjeta-accion__enlace">
                  {accion.texto}
                  <Icono nombre="flechaDerecha" tamano={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="seccion" aria-labelledby="titulo-recientes">
          <div className="seccion__cabecera">
            <div>
              <p className="seccion__eyebrow">Actividad reciente</p>
              <h2 className="seccion__titulo" id="titulo-recientes">
                Últimos productos registrados
              </h2>
            </div>
            <Link className="enlace-sutil" to="/catalogo">
              Ver catálogo completo
              <Icono nombre="flechaDerecha" tamano={16} />
            </Link>
          </div>

          {cargando && recientes.length === 0 ? (
            <Cargando texto="Cargando productos recientes…" />
          ) : recientes.length === 0 ? (
            <EstadoVacio
              icono="caja"
              titulo="El catálogo está vacío"
              mensaje="Registre el primer producto para comenzar a organizar la información de la ferretería."
              accion={
                <Link className="boton boton--primario" to="/registrar">
                  <Icono nombre="registrar" tamano={18} />
                  <span>Registrar primer producto</span>
                </Link>
              }
            />
          ) : (
            <TablaProductos productos={recientes} />
          )}
        </section>
      </div>
    </>
  );
}
