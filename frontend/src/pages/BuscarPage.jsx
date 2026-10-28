import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { BarraBusqueda } from '../components/BarraBusqueda.jsx';
import { Boton } from '../components/Boton.jsx';
import { Cargando } from '../components/Cargando.jsx';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { Paginacion } from '../components/Paginacion.jsx';
import { TablaProductos } from '../components/TablaProductos.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';

export function BuscarPage() {
  useTituloPagina('Buscar productos');
  const [parametros, setParametros] = useSearchParams();
  const q = (parametros.get('q') ?? '').trim();
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1);

  const [texto, setTexto] = useState(q);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    setTexto(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setResultado(null);
      setError(null);
      setCargando(false);
      return undefined;
    }

    let activo = true;
    setCargando(true);
    setError(null);

    api
      .listarProductos({ busqueda: q, pagina, porPagina: 20 })
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
  }, [q, pagina, recarga]);

  function enviar(valor) {
    const limpio = valor.trim();
    const nuevos = new URLSearchParams();
    if (limpio) nuevos.set('q', limpio);
    nuevos.set('pagina', '1');
    setParametros(nuevos);
  }

  function cambiarPagina(nuevaPagina) {
    const nuevos = new URLSearchParams(parametros);
    nuevos.set('pagina', String(nuevaPagina));
    setParametros(nuevos);
  }

  function limpiar() {
    setTexto('');
    setParametros({});
  }

  return (
    <div className="contenedor pagina pagina--estrecha">
      <header className="cabecera-pagina">
        <div>
          <p className="seccion__eyebrow">Búsqueda</p>
          <h1 className="titulo-pagina">Buscar productos</h1>
          <p className="subtitulo-pagina">
            Escriba parte del nombre o del código. La búsqueda consulta directamente la base de
            datos y admite diferencias de mayúsculas, minúsculas y tildes.
          </p>
        </div>
        <Link className="boton boton--secundario" to="/registrar">
          <Icono nombre="registrar" tamano={18} />
          <span>Registrar producto</span>
        </Link>
      </header>

      <section className="panel-busqueda" aria-label="Formulario de búsqueda">
        <BarraBusqueda
          valor={texto}
          onCambiar={setTexto}
          onEnviar={enviar}
          autoFocus
          placeholder="Ejemplo: arena, taladro o un código…"
        />
        {q && (
          <p className="panel-busqueda__estado">
            Resultados para <strong>«{q}»</strong>
            {resultado && ` · ${resultado.paginacion.total} coincidencia${resultado.paginacion.total === 1 ? '' : 's'}`}
          </p>
        )}
      </section>

      {!q ? (
        <EstadoVacio
          icono="buscar"
          titulo="¿Qué producto está buscando?"
          mensaje="Escriba un nombre o código en el buscador para consultar el catálogo. También puede explorar todos los productos desde el catálogo."
          accion={
            <Link className="boton boton--secundario" to="/catalogo">
              <Icono nombre="catalogo" tamano={18} />
              <span>Explorar catálogo</span>
            </Link>
          }
        />
      ) : cargando && !resultado ? (
        <Cargando texto="Buscando coincidencias…" />
      ) : error ? (
        <Alerta
          tipo="error"
          titulo="No se pudo completar la búsqueda"
          accion={
            <Boton variante="secundario" tamano="sm" icono="recargar" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Boton>
          }
        >
          {error.message}
        </Alerta>
      ) : resultado && resultado.paginacion.total === 0 ? (
        <EstadoVacio
          icono="buscar"
          titulo={`No encontramos productos para «${q}»`}
          mensaje="Revise la ortografía, pruebe con menos palabras o busque por el código. Si el producto todavía no existe, puede registrarlo."
          accion={
            <div className="acciones-en-linea">
              <Boton variante="secundario" icono="cerrar" onClick={limpiar}>
                Limpiar búsqueda
              </Boton>
              <Link className="boton boton--primario" to={`/registrar?nombre=${encodeURIComponent(q)}`}>
                <Icono nombre="registrar" tamano={18} />
                <span>Registrar «{q.length > 28 ? `${q.slice(0, 28)}…` : q}»</span>
              </Link>
            </div>
          }
        />
      ) : (
        resultado && (
          <section className="seccion" aria-label="Resultados de búsqueda">
            {cargando && <p className="actualizando">Actualizando resultados…</p>}
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
