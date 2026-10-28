import { errorConflicto, errorValidacion } from '../errors/ErrorAplicacion.js';
import { normalizarCodigo, normalizarTexto } from '../utils/normalizar.js';
import {
  buscarCategoriaPorId,
  buscarCategoriaPorNombreNormalizado,
  buscarUnidadPorId,
  buscarUnidadPorNombreNormalizado,
  crearCategoria,
  crearUnidad,
  listarCategorias,
  listarUnidades,
} from '../repositories/catalogos.repository.js';
import { validarCategoria, validarUnidad } from '../validators/producto.validator.js';

export async function obtenerCategorias() {
  return listarCategorias();
}

export async function registrarCategoria(cuerpo) {
  const { valido, errores, datos } = validarCategoria(cuerpo);
  if (!valido) throw errorValidacion(errores);

  const nombreNormalizado = normalizarTexto(datos.nombre);
  const existente = await buscarCategoriaPorNombreNormalizado(nombreNormalizado);
  if (existente) {
    throw errorConflicto(`La categoría "${existente.nombre}" ya existe.`, 'CATEGORIA_DUPLICADA', {
      categoria: existente,
    });
  }

  try {
    return await crearCategoria({ nombre: datos.nombre, nombreNormalizado });
  } catch (error) {
    if (error.code === '23505') {
      throw errorConflicto('La categoría ya existe.', 'CATEGORIA_DUPLICADA');
    }
    throw error;
  }
}

export async function obtenerUnidades() {
  return listarUnidades();
}

export async function registrarUnidad(cuerpo) {
  const { valido, errores, datos } = validarUnidad(cuerpo);
  if (!valido) throw errorValidacion(errores);

  const nombreNormalizado = normalizarTexto(datos.nombre);
  const abreviaturaNormalizada = normalizarCodigo(datos.abreviatura);

  const existente = await buscarUnidadPorNombreNormalizado(nombreNormalizado);
  if (existente) {
    throw errorConflicto(`La unidad "${existente.nombre}" ya existe.`, 'UNIDAD_DUPLICADA', {
      unidad: existente,
    });
  }

  try {
    return await crearUnidad({
      nombre: datos.nombre,
      nombreNormalizado,
      abreviatura: datos.abreviatura,
      abreviaturaNormalizada,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw errorConflicto(
        'Ya existe una unidad con ese nombre o abreviatura.',
        'UNIDAD_DUPLICADA',
      );
    }
    throw error;
  }
}

export async function validarCategoriaExistente(id) {
  return buscarCategoriaPorId(id);
}

export async function validarUnidadExistente(id) {
  return buscarUnidadPorId(id);
}
