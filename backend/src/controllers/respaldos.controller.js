import {
  crearRespaldo,
  listarRespaldos,
  obtenerRutaRespaldo,
} from '../services/respaldos.service.js';

export async function crear(req, res) {
  const respaldo = await crearRespaldo();
  res.status(201).json({
    datos: respaldo,
    mensaje: 'Respaldo generado correctamente.',
  });
}

export async function listar(req, res) {
  const datos = await listarRespaldos();
  res.json({ datos });
}

export async function descargar(req, res, next) {
  const nombre = req.params.archivo;
  const ruta = await obtenerRutaRespaldo(nombre);

  res.download(ruta, nombre, (error) => {
    if (error && !res.headersSent) next(error);
  });
}
