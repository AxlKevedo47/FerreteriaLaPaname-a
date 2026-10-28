export class ErrorAplicacion extends Error {
  constructor(mensaje, { estado = 500, codigo = 'ERROR_INTERNO', detalles = null } = {}) {
    super(mensaje);
    this.name = 'ErrorAplicacion';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function errorValidacion(detalles) {
  return new ErrorAplicacion('Revise los campos señalados.', {
    estado: 400,
    codigo: 'DATOS_INVALIDOS',
    detalles,
  });
}

export function errorNoEncontrado(mensaje = 'El recurso solicitado no existe.') {
  return new ErrorAplicacion(mensaje, { estado: 404, codigo: 'NO_ENCONTRADO' });
}

export function errorConflicto(mensaje, codigo = 'CONFLICTO', detalles = null) {
  return new ErrorAplicacion(mensaje, { estado: 409, codigo, detalles });
}
