// BITÁCORA (Etapa 2): se usa el driver pg con consultas parametrizadas.
// No se emplea ORM para mantener el proyecto pequeño y transparente.
import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.baseDatos.host,
  port: config.baseDatos.puerto,
  database: config.baseDatos.nombre,
  user: config.baseDatos.usuario,
  password: config.baseDatos.contrasena,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'ferreteria_catalogo',
});

pool.on('error', (error) => {
  // Un cliente inactivo puede perder la conexión; se informa sin exponer datos.
  console.error('[base de datos] Error inesperado en un cliente inactivo:', error.message);
});

export async function verificarConexion() {
  await pool.query('SELECT 1');
}

export async function cerrarPool() {
  await pool.end();
}
