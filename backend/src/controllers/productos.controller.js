import {
  cambiarEstadoProducto,
  consultarResumen,
  editarProducto,
  listarProductos,
  obtenerProducto,
  registrarProducto,
} from '../services/productos.service.js';

export async function listar(req, res) {
  const { productos, paginacion } = await listarProductos(req.query);
  res.json({ datos: productos, paginacion });
}

export async function obtener(req, res) {
  const producto = await obtenerProducto(req.params.id);
  res.json({ datos: producto });
}

export async function crear(req, res) {
  const producto = await registrarProducto(req.body);
  res.status(201).json({
    datos: producto,
    mensaje: 'Producto registrado correctamente.',
  });
}

export async function cambiarEstado(req, res) {
  const resultado = await cambiarEstadoProducto(req.params.id, req.body);
  res.json({
    datos: resultado,
    mensaje: resultado.estado === 'activo' ? 'Producto reactivado.' : 'Producto desactivado.',
  });
}

// Reemplaza los datos editables de un producto. El estado conserva su ruta
// especializada porque es una acción operativa distinta de corregir el catálogo.
export async function editar(req, res) {
  const producto = await editarProducto(req.params.id, req.body);
  res.json({
    datos: producto,
    mensaje: 'Producto actualizado correctamente.',
  });
}

export async function resumen(req, res) {
  const datos = await consultarResumen();
  res.json({ datos });
}
