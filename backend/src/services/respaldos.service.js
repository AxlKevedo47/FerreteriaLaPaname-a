// BITÁCORA (Etapa 6): el respaldo es real. Se ejecuta pg_dump en formato custom
// contra la misma base configurada en .env, se guarda en disco y solo se informa
// éxito si el archivo existe y tiene contenido. No se simula la descarga.
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';
import { ErrorAplicacion, errorNoEncontrado } from '../errors/ErrorAplicacion.js';

const PATRON_RESPALDO = /^ferreteria_\d{8}_\d{6}(?:_\d+)?\.dump$/;
const TIEMPO_MAXIMO_MS = 120_000;

function marcaDeTiempo(fecha = new Date()) {
  const dos = (valor) => String(valor).padStart(2, '0');
  return [
    fecha.getFullYear(),
    dos(fecha.getMonth() + 1),
    dos(fecha.getDate()),
    '_',
    dos(fecha.getHours()),
    dos(fecha.getMinutes()),
    dos(fecha.getSeconds()),
  ].join('');
}

async function nombreDisponible() {
  const base = `ferreteria_${marcaDeTiempo()}`;
  let candidato = `${base}.dump`;
  let intento = 1;

  while (true) {
    try {
      await stat(path.join(config.respaldo.directorio, candidato));
      intento += 1;
      candidato = `${base}_${intento}.dump`;
    } catch (error) {
      if (error.code === 'ENOENT') return candidato;
      throw error;
    }
  }
}

function ejecutarPgDump(rutaArchivo) {
  return new Promise((resolve, reject) => {
    const argumentos = [
      '--host', config.baseDatos.host,
      '--port', String(config.baseDatos.puerto),
      '--username', config.baseDatos.usuario,
      '--dbname', config.baseDatos.nombre,
      '--format=custom',
      '--compress=6',
      '--no-owner',
      '--no-privileges',
      '--file', rutaArchivo,
    ];

    const proceso = spawn(config.respaldo.pgDump, argumentos, {
      env: {
        ...process.env,
        PGPASSWORD: config.baseDatos.contrasena,
        PGCONNECT_TIMEOUT: '10',
      },
      windowsHide: true,
    });

    let errorEstandar = '';
    const temporizador = setTimeout(() => {
      proceso.kill();
      reject(new Error('pg_dump excedió el tiempo máximo de 120 segundos.'));
    }, TIEMPO_MAXIMO_MS);

    proceso.stderr.on('data', (fragmento) => {
      errorEstandar += fragmento.toString();
    });

    proceso.on('error', (error) => {
      clearTimeout(temporizador);
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            'No se encontró pg_dump. Configure PG_DUMP_PATH en .env con la ruta completa al ejecutable.',
          ),
        );
        return;
      }
      reject(error);
    });

    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      if (codigo === 0) {
        resolve();
      } else {
        reject(new Error(errorEstandar.trim() || `pg_dump terminó con código ${codigo}.`));
      }
    });
  });
}

export async function crearRespaldo() {
  await mkdir(config.respaldo.directorio, { recursive: true });
  const nombre = await nombreDisponible();
  const ruta = path.join(config.respaldo.directorio, nombre);

  try {
    await ejecutarPgDump(ruta);
    const informacion = await stat(ruta);
    if (informacion.size === 0) {
      throw new Error('pg_dump generó un archivo vacío.');
    }

    return {
      nombre,
      tamano: informacion.size,
      creadoEn: informacion.mtime.toISOString(),
      descarga: `/api/respaldos/${encodeURIComponent(nombre)}/descargar`,
    };
  } catch (error) {
    // Si falló a medias se elimina el archivo parcial para no confundirlo con
    // un respaldo válido.
    await unlink(ruta).catch(() => {});
    console.error('[respaldo] Falló pg_dump:', error.message);
    throw new ErrorAplicacion(
      'No fue posible generar el respaldo. Verifique que pg_dump esté instalado y que la base de datos esté disponible.',
      {
        estado: 500,
        codigo: 'RESPALDO_FALLIDO',
        detalles: { causa: error.message },
      },
    );
  }
}

export async function listarRespaldos() {
  await mkdir(config.respaldo.directorio, { recursive: true });
  const entradas = await readdir(config.respaldo.directorio, { withFileTypes: true });

  const respaldos = [];
  for (const entrada of entradas) {
    if (!entrada.isFile() || !PATRON_RESPALDO.test(entrada.name)) continue;
    const informacion = await stat(path.join(config.respaldo.directorio, entrada.name));
    respaldos.push({
      nombre: entrada.name,
      tamano: informacion.size,
      creadoEn: informacion.mtime.toISOString(),
      descarga: `/api/respaldos/${encodeURIComponent(entrada.name)}/descargar`,
    });
  }

  return respaldos.sort((a, b) => b.nombre.localeCompare(a.nombre));
}

export async function obtenerRutaRespaldo(nombre) {
  if (!PATRON_RESPALDO.test(nombre)) {
    throw errorNoEncontrado('El respaldo solicitado no existe.');
  }

  const ruta = path.resolve(config.respaldo.directorio, nombre);
  const prefijo = path.resolve(config.respaldo.directorio) + path.sep;
  if (!ruta.startsWith(prefijo)) {
    throw errorNoEncontrado('El respaldo solicitado no existe.');
  }

  try {
    const informacion = await stat(ruta);
    if (!informacion.isFile()) throw new Error('No es un archivo');
  } catch {
    throw errorNoEncontrado('El respaldo solicitado no existe.');
  }

  return ruta;
}
