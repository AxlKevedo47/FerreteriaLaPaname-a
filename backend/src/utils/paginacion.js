export const PAGINA_POR_DEFECTO = 1;
export const TAMANO_POR_DEFECTO = 20;
export const TAMANO_MAXIMO = 100;

export function leerPaginacion(query) {
  const paginaCruda = Number(query.pagina ?? PAGINA_POR_DEFECTO);
  const tamanoCrudo = Number(query.porPagina ?? TAMANO_POR_DEFECTO);

  const pagina = Number.isInteger(paginaCruda) && paginaCruda > 0 ? paginaCruda : PAGINA_POR_DEFECTO;
  const porPagina =
    Number.isInteger(tamanoCrudo) && tamanoCrudo > 0
      ? Math.min(tamanoCrudo, TAMANO_MAXIMO)
      : TAMANO_POR_DEFECTO;

  return {
    pagina,
    porPagina,
    limite: porPagina,
    offset: (pagina - 1) * porPagina,
  };
}

export function construirPaginacion({ pagina, porPagina, total }) {
  return {
    pagina,
    porPagina,
    total,
    totalPaginas: total === 0 ? 0 : Math.ceil(total / porPagina),
    tieneAnterior: pagina > 1,
    tieneSiguiente: pagina * porPagina < total,
  };
}
