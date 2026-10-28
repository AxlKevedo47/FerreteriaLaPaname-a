// BITÁCORA (Etapa 1): la configuración se lee una sola vez desde la raíz del
// proyecto. Así frontend, backend, scripts y respaldos comparten el mismo .env
// y no hay credenciales repartidas por el código.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_PROYECTO = path.resolve(directorioActual, '../../..');

// dotenv no sobrescribe variables ya definidas: esto permite que las pruebas
// apunten a ferreteria_test sin modificar el .env de uso normal.
dotenv.config({ path: path.join(RAIZ_PROYECTO, '.env'), quiet: true });

function textoObligatorio(nombre) {
  const valor = process.env[nombre];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copie .env.example a .env y complete la configuración.`,
    );
  }
  return valor.trim();
}

function enteroPositivo(nombre, valorPorDefecto) {
  const crudo = process.env[nombre] ?? String(valorPorDefecto);
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`La variable ${nombre} debe ser un número entero positivo.`);
  }
  return valor;
}

function rutaResuelta(valor, porDefecto) {
  const ruta = valor?.trim() || porDefecto;
  return path.isAbsolute(ruta) ? ruta : path.resolve(RAIZ_PROYECTO, ruta);
}

const puerto = enteroPositivo('PORT', 4000);

const origenFrontend = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

// BITÁCORA: Vite agrega `crossorigin` a los archivos compilados. Eso hace que
// el navegador envíe el encabezado Origin incluso al pedir recursos del mismo
// servidor. Si el origen propio no está permitido, los assets reciben 403 y la
// página queda sin estilos ni JavaScript. Por eso siempre se admiten los
// orígenes locales del puerto donde escucha la API.
const origenesPropios = [
  `http://localhost:${puerto}`,
  `http://127.0.0.1:${puerto}`,
  `http://[::1]:${puerto}`,
];
const origenesPermitidos = [...new Set([...origenFrontend, ...origenesPropios])];

export const config = {
  puerto,
  entorno: process.env.NODE_ENV?.trim() || 'development',
  cuerpoMaximo: process.env.BODY_LIMIT?.trim() || '100kb',
  origenesPermitidos,
  baseDatos: {
    host: process.env.DB_HOST?.trim() || '127.0.0.1',
    puerto: enteroPositivo('DB_PORT', 5432),
    nombre: textoObligatorio('DB_NAME'),
    usuario: textoObligatorio('DB_USER'),
    contrasena: textoObligatorio('DB_PASSWORD'),
  },
  respaldo: {
    directorio: rutaResuelta(process.env.RESPALDO_DIR, 'backups'),
    pgDump: process.env.PG_DUMP_PATH?.trim() || 'pg_dump',
    pgRestore: process.env.PG_RESTORE_PATH?.trim() || 'pg_restore',
  },
};
