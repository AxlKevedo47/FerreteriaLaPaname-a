import {
  ErrorAplicacion,
  errorConflicto,
  errorNoEncontrado,
  errorValidacion,
} from '../errors/ErrorAplicacion.js';
import { normalizarCodigo, normalizarTexto } from '../utils/normalizar.js';
import { construirPaginacion, leerPaginacion } from '../utils/paginacion.js';
import {
  ORDENES_VALIDOS,
  actualizarEstado,
  buscarPorCodigoNormalizado,
  buscarPosiblesDuplicados,
  actualizarProducto as guardarProductoActualizado,
  buscarProductos,
  crearProducto as insertarProducto,
  obtenerProductoPorId,
  obtenerResumen,
} from '../repositories/productos.repository.js';
import {
  buscarCategoriaPorId,
  buscarUnidadPorId,
} from '../repositories/catalogos.repository.js';
import { validarEstado, validarId, validarProducto } from '../validators/producto.validator.js';

const ESTADOS_VALIDOS = ['activo', 'inactivo', 'todos'];

export async function listarProductos(query = {}) {
  const errores = {};
  const busqueda = typeof query.busqueda === 'string' ? query.busqueda.trim() : '';

  if (busqueda.length > 100) {
    errores.busqueda = 'La búsqueda no puede superar 100 caracteres.';
  }

  let categoriaId = null;
  if (query.categoria !== undefined && query.categoria !== '') {
    categoriaId = validarId(query.categoria);
    if (!categoriaId) errores.categoria = 'La categoría no es válida.';
  }

  const estado = typeof query.estado === 'string' && query.estado !== '' ? query.estado : 'todos';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    errores.estado = 'El estado debe ser activo, inactivo o todos.';
  }

  let fraccionado;
  if (query.fraccionado === 'true') fraccionado = true;
  else if (query.fraccionado === 'false') fraccionado = false;
  else if (query.fraccionado !== undefined && query.fraccionado !== '') {
    errores.fraccionado = 'El filtro de fraccionado debe ser true o false.';
  }

  const orden = typeof query.orden === 'string' && query.orden !== '' ? query.orden : 'nombre_asc';
  if (!ORDENES_VALIDOS.includes(orden)) {
    errores.orden = 'El criterio de orden no es válido.';
  }

  if (Object.keys(errores).length > 0) throw errorValidacion(errores);

  const { pagina, porPagina, limite, offset } = leerPaginacion(query);

  const { total, productos } = await buscarProductos({
    busqueda: normalizarTexto(busqueda),
    categoriaId,
    estado,
    fraccionado,
    orden,
    limite,
    offset,
  });

  return {
    productos,
    paginacion: construirPaginacion({ pagina, porPagina, total }),
  };
}

export async function obtenerProducto(idCrudo) {
  const id = validarId(idCrudo);
  if (!id) throw errorValidacion({ id: 'El identificador del producto no es válido.' });

  const producto = await obtenerProductoPorId(id);
  if (!producto) throw errorNoEncontrado('El producto solicitado no existe.');
  return producto;
}

export async function registrarProducto(cuerpo) {
  const { valido, errores, datos } = validarProducto(cuerpo);
  if (!valido) throw errorValidacion(errores);

  const categoria = await buscarCategoriaPorId(datos.categoriaId);
  if (!categoria) {
    throw errorValidacion({ categoriaId: 'La categoría seleccionada no existe.' });
  }

  const unidadReferencia = await buscarUnidadPorId(datos.unidadReferenciaId);
  if (!unidadReferencia) {
    throw errorValidacion({ unidadReferenciaId: 'La unidad de referencia no existe.' });
  }

  for (const [indice, unidad] of datos.unidadesComercializacion.entries()) {
    const existente = await buscarUnidadPorId(unidad.unidadId);
    if (!existente) {
      throw errorValidacion({
        [`unidadesComercializacion.${indice}.unidadId`]: 'La unidad seleccionada no existe.',
      });
    }
  }

  const codigoNormalizado = datos.codigo ? normalizarCodigo(datos.codigo) : null;

  if (codigoNormalizado) {
    const existente = await buscarPorCodigoNormalizado(codigoNormalizado);
    if (existente) {
      throw errorConflicto(
        `El código "${datos.codigo}" ya está registrado en otro producto.`,
        'CODIGO_DUPLICADO',
        { producto: existente },
      );
    }
  }

  const nombreNormalizado = normalizarTexto(datos.nombre);

  // BITÁCORA: el nombre no es único a nivel de base de datos. Solo se advierte
  // cuando coincide exactamente (sin tildes ni mayúsculas) dentro de la misma
  // categoría; el usuario puede confirmar que se trata de otro producto.
  if (!datos.confirmarDuplicado) {
    const duplicados = await buscarPosiblesDuplicados(nombreNormalizado, datos.categoriaId);
    if (duplicados.length > 0) {
      throw new ErrorAplicacion(
        'Ya existe un producto con el mismo nombre en esta categoría. Revise si es un duplicado.',
        {
          estado: 409,
          codigo: 'POSIBLE_DUPLICADO',
          detalles: { duplicados },
        },
      );
    }
  }

  let productoId;
  try {
    productoId = await insertarProducto({
      ...datos,
      codigoNormalizado,
      nombreNormalizado,
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'productos_codigo_unico') {
      throw errorConflicto(
        `El código "${datos.codigo}" ya está registrado en otro producto.`,
        'CODIGO_DUPLICADO',
      );
    }
    throw error;
  }

  return obtenerProductoPorId(productoId);
}

// La edición usa la misma validación que el alta para que un producto nunca
// quede con una combinación que no podría registrarse desde cero.
export async function editarProducto(idCrudo, cuerpo) {
  const id = validarId(idCrudo);
  if (!id) throw errorValidacion({ id: 'El identificador del producto no es válido.' });

  const existenteProducto = await obtenerProductoPorId(id);
  if (!existenteProducto) throw errorNoEncontrado('El producto solicitado no existe.');

  const { valido, errores, datos } = validarProducto(cuerpo);
  if (!valido) throw errorValidacion(errores);

  const categoria = await buscarCategoriaPorId(datos.categoriaId);
  if (!categoria) throw errorValidacion({ categoriaId: 'La categoría seleccionada no existe.' });

  const unidadReferencia = await buscarUnidadPorId(datos.unidadReferenciaId);
  if (!unidadReferencia) {
    throw errorValidacion({ unidadReferenciaId: 'La unidad de referencia no existe.' });
  }

  for (const [indice, unidad] of datos.unidadesComercializacion.entries()) {
    const existente = await buscarUnidadPorId(unidad.unidadId);
    if (!existente) {
      throw errorValidacion({
        [`unidadesComercializacion.${indice}.unidadId`]: 'La unidad seleccionada no existe.',
      });
    }
  }

  const codigoNormalizado = datos.codigo ? normalizarCodigo(datos.codigo) : null;
  if (codigoNormalizado) {
    const conMismoCodigo = await buscarPorCodigoNormalizado(codigoNormalizado);
    if (conMismoCodigo && Number(conMismoCodigo.id) !== id) {
      throw errorConflicto(
        `El código "${datos.codigo}" ya está registrado en otro producto.`,
        'CODIGO_DUPLICADO',
        { producto: conMismoCodigo },
      );
    }
  }

  const nombreNormalizado = normalizarTexto(datos.nombre);
  if (!datos.confirmarDuplicado) {
    const duplicados = (await buscarPosiblesDuplicados(nombreNormalizado, datos.categoriaId))
      .filter((producto) => producto.id !== id);
    if (duplicados.length > 0) {
      throw new ErrorAplicacion(
        'Ya existe un producto con el mismo nombre en esta categoría. Revise si es un duplicado.',
        { estado: 409, codigo: 'POSIBLE_DUPLICADO', detalles: { duplicados } },
      );
    }
  }

  try {
    await guardarProductoActualizado(id, { ...datos, codigoNormalizado, nombreNormalizado });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'productos_codigo_unico') {
      throw errorConflicto(`El código "${datos.codigo}" ya está registrado en otro producto.`, 'CODIGO_DUPLICADO');
    }
    throw error;
  }

  return obtenerProductoPorId(id);
}

export async function cambiarEstadoProducto(idCrudo, cuerpo) {
  const id = validarId(idCrudo);
  if (!id) throw errorValidacion({ id: 'El identificador del producto no es válido.' });

  const { valido, errores, datos } = validarEstado(cuerpo);
  if (!valido) throw errorValidacion(errores);

  const actualizado = await actualizarEstado(id, datos.estado);
  if (!actualizado) throw errorNoEncontrado('El producto solicitado no existe.');
  return actualizado;
}

export async function consultarResumen() {
  return obtenerResumen();
}
