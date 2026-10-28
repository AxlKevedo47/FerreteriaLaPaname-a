import { ErrorAplicacion } from '../errors/ErrorAplicacion.js';

const CODIGOS_CONEXION = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  '28P01',
  '3D000',
  '57P01',
  '08000',
  '08001',
  '08003',
  '08006',
]);

const CODIGOS_UNIQUE = {
  productos_codigo_unico: {
    codigo: 'CODIGO_DUPLICADO',
    mensaje: 'Ya existe un producto con ese código.',
  },
  categorias_nombre_normalizado_key: {
    codigo: 'CATEGORIA_DUPLICADA',
    mensaje: 'La categoría ya existe.',
  },
  unidades_medida_nombre_normalizado_key: {
    codigo: 'UNIDAD_DUPLICADA',
    mensaje: 'Ya existe una unidad con ese nombre.',
  },
  unidades_medida_abreviatura_normalizada_key: {
    codigo: 'UNIDAD_DUPLICADA',
    mensaje: 'Ya existe una unidad con esa abreviatura.',
  },
  producto_unidades_producto_id_unidad_id_key: {
    codigo: 'UNIDAD_REPETIDA',
    mensaje: 'La unidad está repetida en el producto.',
  },
};

// BITÁCORA (Etapa 6): un único manejador traduce errores técnicos a respuestas
// comprensibles. Nunca se devuelve la contraseña ni el stack al cliente.
export function manejadorErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ErrorAplicacion) {
    return res.status(error.estado).json({
      error: {
        codigo: error.codigo,
        mensaje: error.message,
        ...(error.detalles ? { detalles: error.detalles } : {}),
      },
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: {
        codigo: 'JSON_INVALIDO',
        mensaje: 'El cuerpo de la solicitud no es un JSON válido.',
      },
    });
  }

  if (error.code === '23505') {
    const conocido = CODIGOS_UNIQUE[error.constraint];
    return res.status(409).json({
      error: conocido ?? {
        codigo: 'REGISTRO_DUPLICADO',
        mensaje: 'Ya existe un registro con esos datos.',
      },
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      error: {
        codigo: 'REFERENCIA_INVALIDA',
        mensaje: 'Uno de los datos relacionados no existe o está en uso.',
      },
    });
  }

  if (error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({
      error: {
        codigo: 'DATO_INVALIDO',
        mensaje: 'Uno de los datos enviados no cumple las restricciones de la base de datos.',
      },
    });
  }

  if (CODIGOS_CONEXION.has(error.code)) {
    console.error('[base de datos] Error de conexión:', error.message);
    return res.status(503).json({
      error: {
        codigo: 'BASE_DATOS_NO_DISPONIBLE',
        mensaje:
          'No se pudo conectar con PostgreSQL. Verifique que el servicio esté iniciado y que las variables DB_* de .env sean correctas.',
      },
    });
  }

  console.error('[api] Error no controlado:', error);
  return res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrió un error inesperado. Intente nuevamente o revise los registros del servidor.',
    },
  });
}
