// Normaliza texto para búsquedas y comparaciones: sin tildes, minúsculas y
// espacios colapsados. Se aplica tanto al guardar como al consultar, de modo
// que "Arena  Fina" y "arena fina" se consideren equivalentes.
export function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Los códigos se comparan en mayúsculas y sin tildes, pero se muestran tal como
// los escribió el usuario.
export function normalizarCodigo(valor) {
  return normalizarTexto(valor).toUpperCase();
}

export function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : '';
}

export function limpiarTextoLargo(valor) {
  return typeof valor === 'string' ? valor.replace(/\r\n/g, '\n').trim() : '';
}
