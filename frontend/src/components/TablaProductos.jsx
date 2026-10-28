import { Link } from 'react-router-dom';
import { EstadoBadge, EtiquetaFraccionado } from './EstadoBadge.jsx';

export function TablaProductos({ productos }) {
  return (
    <div className="tabla-contenedor" role="region" aria-label="Listado de productos" tabIndex={0}>
      <table className="tabla tabla--productos">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Categoría</th>
            <th scope="col">Unidad de referencia</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="visualmente-oculto">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td data-etiqueta="Producto">
                <Link className="producto-celda" to={`/productos/${producto.id}`}>
                  <span className="producto-celda__nombre">{producto.nombre}</span>
                  <span className="producto-celda__meta">
                    {producto.codigo ? `Código: ${producto.codigo}` : 'Sin código'}
                  </span>
                  {producto.esFraccionado && (
                    <span className="producto-celda__etiquetas">
                      <EtiquetaFraccionado />
                    </span>
                  )}
                </Link>
              </td>
              <td data-etiqueta="Categoría">{producto.categoria.nombre}</td>
              <td data-etiqueta="Unidad">
                <span className="unidad-celda">
                  {producto.unidadReferencia.nombre}
                  <span className="texto-suave"> ({producto.unidadReferencia.abreviatura})</span>
                  {producto.unidadesAdicionales > 0 && (
                    <span className="mini-etiqueta" title="Unidades adicionales de comercialización">
                      +{producto.unidadesAdicionales}
                    </span>
                  )}
                </span>
              </td>
              <td data-etiqueta="Estado">
                <EstadoBadge estado={producto.estado} />
              </td>
              <td data-etiqueta="Acciones" className="tabla__acciones">
                <Link className="boton boton--fantasma boton--sm" to={`/productos/${producto.id}`}>
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
