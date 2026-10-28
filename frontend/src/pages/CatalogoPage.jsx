import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { Boton } from '../components/Boton.jsx';
import { Cargando } from '../components/Cargando.jsx';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { Paginacion } from '../components/Paginacion.jsx';
import { TablaProductos } from '../components/TablaProductos.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';

const ORDENES = [
  { valor: 'nombre_asc', texto: 'Nombre (A–Z)' },
  { valor: 'nombre_desc', texto: 'Nombre (Z–A)' },
  { valor: 'codigo_asc', texto: 'Código (A–Z)' },
  { valor: 'reciente', texto: 'Más recientes' },
];

export function CatalogoPage() {
  useTituloPagina('Catálogo de productos');
  const [parametros, setParametros] = useSearchParams();

  const categoria = parametros.get('categoria') ?? '';
  const estado = parametros.get('estado') ?? 'todos';
  const fraccionado = parametros.get('fraccionado') ?? '';
  const orden = parametros.get('orden') ?? 'nombre_asc';
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1);

  const [categorias, setCategorias] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    api
      .listarCategorias()
      .then((respuesta) => {
        if (activo) setCategorias(respuesta.datos);
      })
      .catch(() => {
        if (activo) setCategorias([]);
      });
    return () => {
      activo = false;
    };
  }, [recarga]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    api
      .listarProductos({
        categoria: categoria || undefined,
        estado,
        fraccionado: fraccionado || undefined,
        orden,
        pagina,
        porPagina: 20,
      })
      .then((respuesta) => {
        if (activo) setResultado(respuesta);
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
  }, [categoria, estado, fraccionado, orden, pagina, recarga]);

  function actualizarFiltro(clave, valor) {
    const nuevos = new URLSearchParams(parametros);
    if (valor === '' || valor === 'todos') {
      nuevos.delete(clave);
    } else {
      nuevos.set(clave, valor);
    }
    nuevos.set('pagina', '1');
    setParametros(nuevos);
  }

  function cambiarPagina(nuevaPagina) {
    const nuevos = new URLSearchParams(parametros);
    nuevos.set('pagina', String(nuevaPagina));
    setParametros(nuevos);
  }

  function limpiarFiltros() {
    setParametros({});
  }

  const hayFiltros =
    categoria !== '' || estado !== 'todos' || fraccionado !== '' || orden !== 'nombre_asc';

  return (
    <div className="contenedor pagina">
      <header className="cabecera-pagina">
        <div>
          <p className="seccion__eyebrow">Organización</p>
          <h1 className="titulo-pagina">Catálogo de productos</h1>
          <p className="subtitulo-pagina">
            Consulte todos los productos registrados, filtre por categoría o estado y abra el
            detalle de cada uno.
          </p>
        </div>
        <Link className="boton boton--primario" to="/registrar">
          <Icono nombre="registrar" tamano={18} />
          <span>Nuevo producto</span>
        </Link>
      </header>

      <section className="panel-filtros" aria-label="Filtros del catálogo">
        <div className="panel-filtros__cabecera">
          <span className="panel-filtros__titulo">
            <Icono nombre="filtro" tamano={17} />
            Filtros
          </span>
          {hayFiltros && (
            <button type="button" className="enlace-boton" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="panel-filtros__rejilla">
          <label className="filtro">
            <span className="filtro__etiqueta">Categoría</span>
            <select
              className="campo__control"
              value={categoria}
              onChange={(evento) => actualizarFiltro('categoria', evento.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} ({item.productos})
                </option>
              ))}
            </select>
          </label>

          <label className="filtro">
            <span className="filtro__etiqueta">Estado</span>
            <select
              className="campo__control"
              value={estado}
              onChange={(evento) => actualizarFiltro('estado', evento.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>
          </label>

          <label className="filtro">
            <span className="filtro__etiqueta">Tipo de producto</span>
            <select
              className="campo__control"
              value={fraccionado}
              onChange={(evento) => actualizarFiltro('fraccionado', evento.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Solo fraccionados</option>
              <option value="false">No fraccionados</option>
            </select>
          </label>

          <label className="filtro">
            <span className="filtro__etiqueta">Ordenar por</span>
            <select
              className="campo__control"
              value={orden}
              onChange={(evento) => actualizarFiltro('orden', evento.target.value)}
            >
              {ORDENES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar el catálogo"
          accion={
            <Boton variante="secundario" tamano="sm" icono="recargar" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Boton>
          }
        >
          {error.message}
        </Alerta>
      ) : cargando && !resultado ? (
        <Cargando texto="Cargando catálogo…" />
      ) : resultado && resultado.paginacion.total === 0 ? (
        <EstadoVacio
          icono="caja"
          titulo="No hay productos con estos filtros"
          mensaje={
            hayFiltros
              ? 'Pruebe con otros filtros o limpie la selección para ver todo el catálogo.'
              : 'El catálogo todavía está vacío. Registre el primer producto para comenzar.'
          }
          accion={
            hayFiltros ? (
              <Boton variante="secundario" icono="recargar" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            ) : (
              <Link className="boton boton--primario" to="/registrar">
                <Icono nombre="registrar" tamano={18} />
                <span>Registrar producto</span>
              </Link>
            )
          }
        />
      ) : (
        resultado && (
          <section className="seccion" aria-label="Productos del catálogo">
            <div className="resultado-cabecera">
              <p className="resultado-cabecera__conteo">
                <strong>{resultado.paginacion.total}</strong>{' '}
                {resultado.paginacion.total === 1 ? 'producto encontrado' : 'productos encontrados'}
              </p>
              {cargando && <span className="actualizando">Actualizando…</span>}
            </div>
            <TablaProductos productos={resultado.datos} />
            <Paginacion
              paginacion={resultado.paginacion}
              onCambiar={cambiarPagina}
              cargando={cargando}
            />
          </section>
        )
      )}
    </div>
  );
}
