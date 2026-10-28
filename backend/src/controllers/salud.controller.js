import { pool } from '../config/db.js';

export async function salud(req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({
      estado: 'ok',
      baseDatos: 'conectada',
      servicio: 'ferreteria-api',
      hora: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[salud] La base de datos no responde:', error.message);
    res.status(503).json({
      estado: 'degradado',
      baseDatos: 'no disponible',
      mensaje:
        'No se pudo conectar con PostgreSQL. Verifique que el servicio esté iniciado y que las variables DB_* de .env sean correctas.',
    });
  }
}
