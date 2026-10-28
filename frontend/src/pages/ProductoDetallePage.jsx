import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { Boton } from '../components/Boton.jsx';
import { Cargando } from '../components/Cargando.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EstadoBadge, EtiquetaFraccionado } from '../components/EstadoBadge.jsx';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';
import { formatearFechaHora } from '../utils/formato.js';

function Dato({ etiqueta, children }) {
  return (
    <div className="dato-detalle">
      <dt className="dato-detalle__etiqueta">{etiqueta}</dt>
      <dd className="dato-detalle__valor">{children}</dd>
    </div>
  );
}

export function ProductoDetallePage() {
  const { id } = useParams();
  const toast = useToast();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  useTituloPagina(producto?.nombre ?? 'Detalle del producto');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    api
      .obtenerProducto(id)
      .then((respuesta) => {
        if (activo) setProducto(respuesta.datos);
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
  }, [id, recarga]);

  async function cambiarEstado() {
    if (!producto) return;
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';
    setCambiando(true);
    try {
      const respuesta = await api.cambiarEstadoProducto(producto.id, nuevoEstado);
      setProducto((actual) => ({
        ...actual,
        estado: respuesta.datos.estado,
        actualizadoEn: respuesta.datos.actualizadoEn,
      }));
      setDialogoAbierto(false);
      toast.exito(respuesta.mensaje);
    } catch (fallo) {
      toast.error(fallo.message);
    } finally {
      setCambiando(false);
    }
  }

  if (cargando) {
    return (
      <div className="contenedor pagina">
        <Cargando texto="Cargando producto…" />
      </div>
    );
  }

  if (error?.estado === 404) {
    return (
      <div className="contenedor pagina pagina--estrecha">
        <EstadoVacio
          icono="caja"
          titulo="Producto no encontrado"
          mensaje="El producto que busca no existe o fue eliminado de la base de datos."
          accion={
            <Link className="boton boton--primario" to="/catalogo">
              <Icono nombre="catalogo" tamano={18} />
              <span>Volver al catálogo</span>
            </Link>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="contenedor pagina">
        <Alerta
          tipo="error"
          titulo="No se pudo cargar el producto"
          accion={
            <Boton variante="secundario" tamano="sm" icono="recargar" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Boton>
          }
        >
          {error.message}
        </Alerta>
        <Link className="enlace-sutil" to="/catalogo">
          <Icono nombre="flechaIzquierda" tamano={16} />
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const esActivo = producto.estado === 'activo';

  return (
    <div className="contenedor pagina">
      <nav className="migas" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <Icono nombre="chevronDerecha" tamano={14} />
        <Link to="/catalogo">Catálogo</Link>
        <Icono nombre="chevronDerecha" tamano={14} />
        <span aria-current="page">{producto.nombre}</span>
      </nav>

      <header className="detalle-cabecera">
        <div className="detalle-cabecera__principal">
          <div className="detalle-cabecera__etiquetas">
            <EstadoBadge estado={producto.estado} />
            {producto.esFraccionado && <EtiquetaFraccionado />}
          </div>
          <h1 className="titulo-pagina">{producto.nombre}</h1>
          <p className="detalle-cabecera__codigo">
            {producto.codigo ? (
              <>
                Código <strong>{producto.codigo}</strong>
              </>
            ) : (
              'Sin código asignado'
            )}
            <span aria-hidden="true"> · </span>
            ID interno <strong>{producto.id}</strong>
          </p>
        </div>

        <div className="detalle-cabecera__acciones">
          <Link className="boton boton--secundario" to="/catalogo">
            <Icono nombre="flechaIzquierda" tamano={18} />
            <span>Volver al catálogo</span>
          </Link>
          <Boton
            variante={esActivo ? 'peligro-suave' : 'primario'}
            icono={esActivo ? 'cerrar' : 'check'}
            onClick={() => setDialogoAbierto(true)}
          >
            {esActivo ? 'Desactivar producto' : 'Reactivar producto'}
          </Boton>
        </div>
      </header>

      <div className="detalle-rejilla">
        <section className="tarjeta" aria-labelledby="titulo-datos">
          <div className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo" id="titulo-datos">
              Información general
            </h2>
          </div>
          <dl className="datos-detalle">
            <Dato etiqueta="Categoría">{producto.categoria.nombre}</Dato>
            <Dato etiqueta="Unidad de referencia">
              {producto.unidadReferencia.nombre}{' '}
              <span className="texto-suave">({producto.unidadReferencia.abreviatura})</span>
            </Dato>
            <Dato etiqueta="Registrado">{formatearFechaHora(producto.creadoEn)}</Dato>
            <Dato etiqueta="Última actualización">{formatearFechaHora(producto.actualizadoEn)}</Dato>
            <Dato etiqueta="Unidades adicionales">
              {producto.unidadesComercializacion.length > 0
                ? `${producto.unidadesComercializacion.length} configurada${producto.unidadesComercializacion.length === 1 ? '' : 's'}`
                : 'Ninguna'}
            </Dato>
            <Dato etiqueta="Tipo de venta">
              {producto.esFraccionado ? 'Producto fraccionado' : 'Venta por unidad completa'}
            </Dato>
          </dl>
        </section>

        <section className="tarjeta" aria-labelledby="titulo-descripcion">
          <div className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo" id="titulo-descripcion">
              Descripción
            </h2>
          </div>
          {producto.descripcion ? (
            <p className="detalle-descripcion">{producto.descripcion}</p>
          ) : (
            <p className="texto-vacio">Este producto no tiene una descripción registrada.</p>
          )}
        </section>
      </div>

      <section className="tarjeta" aria-labelledby="titulo-unidades">
        <div className="tarjeta__cabecera tarjeta__cabecera--dividida">
          <div>
            <h2 className="tarjeta__titulo" id="titulo-unidades">
              Unidades y comercialización
            </h2>
            <p className="tarjeta__subtitulo">
              La unidad de referencia es la base para registrar equivalencias. Las conversiones
              solo se muestran cuando el negocio las ha confirmado.
            </p>
          </div>
        </div>

        <div className="unidad-referencia">
          <span className="unidad-referencia__icono" aria-hidden="true">
            <Icono nombre="balanza" tamano={22} />
          </span>
          <div>
            <p className="unidad-referencia__etiqueta">Unidad de referencia</p>
            <p className="unidad-referencia__valor">
              {producto.unidadReferencia.nombre}{' '}
              <span>({producto.unidadReferencia.abreviatura})</span>
            </p>
          </div>
        </div>

        {producto.unidadesComercializacion.length === 0 ? (
          <p className="texto-vacio">
            No se registraron otras unidades de comercialización. El producto se consulta en su
            unidad de referencia.
          </p>
        ) : (
          <ul className="unidades-lista">
            {producto.unidadesComercializacion.map((unidad) => (
              <li key={unidad.id} className="unidad-item">
                <div className="unidad-item__cabecera">
                  <strong>{unidad.nombre}</strong>
                  <span className="texto-suave">({unidad.abreviatura})</span>
                </div>
                <p className="unidad-item__equivalencia">
                  {unidad.equivalencia !== null ? (
                    <>
                      1 {unidad.abreviatura} ={' '}
                      <strong>
                        {unidad.equivalencia.toLocaleString('es-PA')}{' '}
                        {producto.unidadReferencia.abreviatura}
                      </strong>
                    </>
                  ) : (
                    <span className="pendiente">Equivalencia pendiente de confirmar</span>
                  )}
                </p>
                {unidad.notaEquivalencia && (
                  <p className="unidad-item__nota">{unidad.notaEquivalencia}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        abierto={dialogoAbierto}
        titulo={esActivo ? 'Desactivar producto' : 'Reactivar producto'}
        textoConfirmar={esActivo ? 'Sí, desactivar' : 'Sí, reactivar'}
        variante={esActivo ? 'peligro' : 'primario'}
        onConfirmar={cambiarEstado}
        onCancelar={() => setDialogoAbierto(false)}
        cargando={cambiando}
      >
        <p>
          {esActivo
            ? 'El producto dejará de aparecer como activo, pero no se eliminará de la base de datos. Puede reactivarlo más adelante.'
            : 'El producto volverá a estar disponible como activo en el catálogo.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
