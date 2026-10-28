import { Icono } from './Icono.jsx';

function calcularPaginas(pagina, totalPaginas) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  }

  const paginas = new Set([1, totalPaginas, pagina]);
  if (pagina - 1 > 1) paginas.add(pagina - 1);
  if (pagina + 1 < totalPaginas) paginas.add(pagina + 1);
  if (pagina <= 3) {
    paginas.add(2);
    paginas.add(3);
    paginas.add(4);
  }
  if (pagina >= totalPaginas - 2) {
    paginas.add(totalPaginas - 1);
    paginas.add(totalPaginas - 2);
    paginas.add(totalPaginas - 3);
  }

  const ordenadas = [...paginas].filter((numero) => numero >= 1 && numero <= totalPaginas).sort((a, b) => a - b);
  const resultado = [];
  ordenadas.forEach((numero, indice) => {
    if (indice > 0 && numero - ordenadas[indice - 1] > 1) resultado.push(`separador-${numero}`);
    resultado.push(numero);
  });
  return resultado;
}

export function Paginacion({ paginacion, onCambiar, cargando = false }) {
  if (!paginacion || paginacion.total === 0) return null;

  const { pagina, porPagina, total, totalPaginas, tieneAnterior, tieneSiguiente } = paginacion;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  const paginas = calcularPaginas(pagina, totalPaginas);

  return (
    <nav className="paginacion" aria-label="Paginación de resultados">
      <p className="paginacion__resumen">
        Mostrando <strong>{desde}–{hasta}</strong> de <strong>{total}</strong>
      </p>
      <div className="paginacion__controles">
        <button
          type="button"
          className="paginacion__boton"
          onClick={() => onCambiar(pagina - 1)}
          disabled={!tieneAnterior || cargando}
          aria-label="Página anterior"
        >
          <Icono nombre="chevronIzquierda" tamano={17} />
        </button>

        {paginas.map((numero) =>
          typeof numero === 'string' ? (
            <span key={numero} className="paginacion__separador" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={numero}
              type="button"
              className={`paginacion__boton ${numero === pagina ? 'paginacion__boton--actual' : ''}`}
              onClick={() => onCambiar(numero)}
              disabled={cargando || numero === pagina}
              aria-label={`Página ${numero}`}
              aria-current={numero === pagina ? 'page' : undefined}
            >
              {numero}
            </button>
          ),
        )}

        <button
          type="button"
          className="paginacion__boton"
          onClick={() => onCambiar(pagina + 1)}
          disabled={!tieneSiguiente || cargando}
          aria-label="Página siguiente"
        >
          <Icono nombre="chevronDerecha" tamano={17} />
        </button>
      </div>
    </nav>
  );
}
