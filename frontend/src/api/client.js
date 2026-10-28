const BASE_API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ErrorApi extends Error {
  constructor(mensaje, { codigo = 'ERROR_API', estado = 0, detalles = null } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.estado = estado;
    this.detalles = detalles;
  }

  get duplicados() {
    return this.detalles?.duplicados ?? [];
  }
}

async function solicitar(ruta, { metodo = 'GET', cuerpo, signal } = {}) {
  const opciones = {
    method: metodo,
    headers: { Accept: 'application/json' },
    signal,
  };

  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE_API}${ruta}`, opciones);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ErrorApi(
      'No se pudo conectar con el servidor. Verifique que el backend esté iniciado.',
      { codigo: 'SIN_CONEXION' },
    );
  }

  const texto = await respuesta.text();
  let contenido = null;
  if (texto) {
    try {
      contenido = JSON.parse(texto);
    } catch {
      contenido = null;
    }
  }

  if (!respuesta.ok) {
    throw new ErrorApi(
      contenido?.error?.mensaje || `La solicitud falló (código ${respuesta.status}).`,
      {
        codigo: contenido?.error?.codigo,
        estado: respuesta.status,
        detalles: contenido?.error?.detalles ?? null,
      },
    );
  }

  return contenido;
}

function conParametros(ruta, parametros = {}) {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null || valor === '') continue;
    busqueda.set(clave, String(valor));
  }
  const cadena = busqueda.toString();
  return cadena ? `${ruta}?${cadena}` : ruta;
}

export const api = {
  listarProductos(parametros) {
    return solicitar(conParametros('/productos', parametros));
  },

  obtenerProducto(id) {
    return solicitar(`/productos/${encodeURIComponent(id)}`);
  },

  crearProducto(datos) {
    return solicitar('/productos', { metodo: 'POST', cuerpo: datos });
  },

  cambiarEstadoProducto(id, estado) {
    return solicitar(`/productos/${encodeURIComponent(id)}/estado`, {
      metodo: 'PATCH',
      cuerpo: { estado },
    });
  },

  obtenerResumen() {
    return solicitar('/resumen');
  },

  listarCategorias() {
    return solicitar('/categorias');
  },

  crearCategoria(datos) {
    return solicitar('/categorias', { metodo: 'POST', cuerpo: datos });
  },

  listarUnidades() {
    return solicitar('/unidades');
  },

  crearUnidad(datos) {
    return solicitar('/unidades', { metodo: 'POST', cuerpo: datos });
  },

  listarRespaldos() {
    return solicitar('/respaldos');
  },

  crearRespaldo() {
    return solicitar('/respaldos', { metodo: 'POST' });
  },

  urlDescargaRespaldo(nombre) {
    return `${BASE_API}/respaldos/${encodeURIComponent(nombre)}/descargar`;
  },
};
