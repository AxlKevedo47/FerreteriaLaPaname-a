import { limpiarTexto, limpiarTextoLargo } from '../utils/normalizar.js';

// Reglas compartidas por alta y edición. Mantenerlas en un solo módulo evita
// que una vía permita guardar productos que la otra rechaza.

const PATRON_CODIGO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ._/-]+(?:\s[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ._/-]+)*$/;

function enteroPositivo(valor) {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  }
  if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) {
    const numero = Number(valor.trim());
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  }
  return null;
}

function booleano(valor, porDefecto = false) {
  if (valor === undefined || valor === null) return porDefecto;
  if (typeof valor === 'boolean') return valor;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return null;
}

function numeroPositivoOpcional(valor) {
  if (valor === undefined || valor === null || valor === '') return { valido: true, valor: null };
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero <= 0 || numero > 9_999_999_999) {
    return { valido: false, valor: null };
  }
  return { valido: true, valor: numero };
}

function validarUnidades(valor, errores, unidadReferenciaId) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) {
    errores.unidadesComercializacion = 'Las unidades de comercialización deben enviarse como una lista.';
    return [];
  }
  if (valor.length > 20) {
    errores.unidadesComercializacion = 'No se pueden asociar más de 20 unidades a un producto.';
    return [];
  }

  const unidades = [];
  const vistas = new Set();

  valor.forEach((item, indice) => {
    if (!item || typeof item !== 'object') {
      errores[`unidadesComercializacion.${indice}`] = 'La unidad no tiene un formato válido.';
      return;
    }
    const unidadId = enteroPositivo(item.unidadId);
    if (!unidadId) {
      errores[`unidadesComercializacion.${indice}.unidadId`] = 'Seleccione una unidad válida.';
      return;
    }
    if (vistas.has(unidadId)) {
      errores[`unidadesComercializacion.${indice}.unidadId`] = 'La unidad está repetida.';
      return;
    }
    vistas.add(unidadId);

    if (unidadReferenciaId && unidadId === unidadReferenciaId) {
      errores[`unidadesComercializacion.${indice}.unidadId`] =
        'La unidad de referencia no debe repetirse en las unidades de comercialización.';
      return;
    }

    const equivalencia = numeroPositivoOpcional(item.equivalencia);
    if (!equivalencia.valido) {
      errores[`unidadesComercializacion.${indice}.equivalencia`] =
        'La equivalencia debe ser un número mayor que cero.';
      return;
    }

    const notaEquivalencia = limpiarTextoLargo(item.notaEquivalencia);
    if (notaEquivalencia.length > 200) {
      errores[`unidadesComercializacion.${indice}.notaEquivalencia`] =
        'La nota de equivalencia no puede superar 200 caracteres.';
      return;
    }

    unidades.push({
      unidadId,
      equivalencia: equivalencia.valor,
      notaEquivalencia: notaEquivalencia || null,
    });
  });

  return unidades;
}

export function validarProducto(cuerpo = {}) {
  const errores = {};
  const nombre = limpiarTexto(cuerpo.nombre);
  const codigo = limpiarTexto(cuerpo.codigo);
  const descripcion = limpiarTextoLargo(cuerpo.descripcion);
  const categoriaId = enteroPositivo(cuerpo.categoriaId);
  const unidadReferenciaId = enteroPositivo(cuerpo.unidadReferenciaId);
  const esFraccionado = booleano(cuerpo.esFraccionado, false);
  const confirmarDuplicado = booleano(cuerpo.confirmarDuplicado, false);

  if (!nombre) {
    errores.nombre = 'El nombre del producto es obligatorio.';
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  } else if (nombre.length > 150) {
    errores.nombre = 'El nombre no puede superar 150 caracteres.';
  }

  if (codigo.length > 40) {
    errores.codigo = 'El código no puede superar 40 caracteres.';
  } else if (codigo && !PATRON_CODIGO.test(codigo)) {
    errores.codigo = 'Use solo letras, números, espacios, puntos, guiones, guiones bajos o barras.';
  }

  if (descripcion.length > 1000) {
    errores.descripcion = 'La descripción no puede superar 1000 caracteres.';
  }

  if (!categoriaId) {
    errores.categoriaId = 'Seleccione una categoría.';
  }

  if (!unidadReferenciaId) {
    errores.unidadReferenciaId = 'Seleccione la unidad de referencia.';
  }

  if (esFraccionado === null) {
    errores.esFraccionado = 'El indicador de producto fraccionado debe ser verdadero o falso.';
  }

  if (confirmarDuplicado === null) {
    errores.confirmarDuplicado = 'El indicador de confirmación debe ser verdadero o falso.';
  }

  const unidadesComercializacion = validarUnidades(
    cuerpo.unidadesComercializacion,
    errores,
    unidadReferenciaId,
  );

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      nombre,
      codigo: codigo || null,
      descripcion: descripcion || null,
      categoriaId,
      unidadReferenciaId,
      esFraccionado: Boolean(esFraccionado),
      unidadesComercializacion,
      confirmarDuplicado: Boolean(confirmarDuplicado),
    },
  };
}

export function validarCategoria(cuerpo = {}) {
  const errores = {};
  const nombre = limpiarTexto(cuerpo.nombre);

  if (!nombre) {
    errores.nombre = 'El nombre de la categoría es obligatorio.';
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  } else if (nombre.length > 80) {
    errores.nombre = 'El nombre no puede superar 80 caracteres.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: { nombre },
  };
}

export function validarUnidad(cuerpo = {}) {
  const errores = {};
  const nombre = limpiarTexto(cuerpo.nombre);
  const abreviatura = limpiarTexto(cuerpo.abreviatura);

  if (!nombre) {
    errores.nombre = 'El nombre de la unidad es obligatorio.';
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  } else if (nombre.length > 60) {
    errores.nombre = 'El nombre no puede superar 60 caracteres.';
  }

  if (!abreviatura) {
    errores.abreviatura = 'La abreviatura es obligatoria.';
  } else if (abreviatura.length > 12) {
    errores.abreviatura = 'La abreviatura no puede superar 12 caracteres.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: { nombre, abreviatura },
  };
}

export function validarEstado(cuerpo = {}) {
  const estado = typeof cuerpo.estado === 'string' ? cuerpo.estado.trim() : '';
  if (!['activo', 'inactivo'].includes(estado)) {
    return {
      valido: false,
      errores: { estado: 'El estado debe ser "activo" o "inactivo".' },
      datos: null,
    };
  }
  return { valido: true, errores: {}, datos: { estado } };
}

export function validarId(valor) {
  const id = enteroPositivo(valor);
  return id;
}
