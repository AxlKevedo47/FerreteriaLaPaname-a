import {
  obtenerCategorias,
  obtenerUnidades,
  registrarCategoria,
  registrarUnidad,
} from '../services/catalogos.service.js';

export async function listarCategorias(req, res) {
  const datos = await obtenerCategorias();
  res.json({ datos });
}

export async function crearCategoria(req, res) {
  const datos = await registrarCategoria(req.body);
  res.status(201).json({ datos, mensaje: 'Categoría creada correctamente.' });
}

export async function listarUnidades(req, res) {
  const datos = await obtenerUnidades();
  res.json({ datos });
}

export async function crearUnidad(req, res) {
  const datos = await registrarUnidad(req.body);
  res.status(201).json({ datos, mensaje: 'Unidad creada correctamente.' });
}
