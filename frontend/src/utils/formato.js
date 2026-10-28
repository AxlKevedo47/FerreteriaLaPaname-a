const formatoFecha = new Intl.DateTimeFormat('es-PA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-PA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : formatoFecha.format(fecha);
}

export function formatearFechaHora(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : formatoFechaHora.format(fecha);
}

export function formatearTamano(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  const valor = bytes / 1024 ** indice;
  return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

export function pluralizar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
