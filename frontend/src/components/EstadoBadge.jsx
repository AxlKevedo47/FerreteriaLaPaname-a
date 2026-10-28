export function EstadoBadge({ estado }) {
  const activo = estado === 'activo';
  return (
    <span className={`etiqueta ${activo ? 'etiqueta--activo' : 'etiqueta--inactivo'}`}>
      <span className="etiqueta__punto" aria-hidden="true" />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function EtiquetaFraccionado() {
  return (
    <span className="etiqueta etiqueta--fraccionado">
      <span className="etiqueta__punto" aria-hidden="true" />
      Fraccionado
    </span>
  );
}
