import { config } from './config/env.js';
import { cerrarPool, verificarConexion } from './config/db.js';
import { crearApp } from './app.js';

const app = crearApp();

try {
  await verificarConexion();
  console.log(`[base de datos] Conectada a ${config.baseDatos.nombre} en ${config.baseDatos.host}:${config.baseDatos.puerto}`);
} catch (error) {
  console.error('[base de datos] No fue posible conectar al iniciar:', error.message);
  console.error('[base de datos] La API seguirá disponible y /api/salud informará el problema.');
}

const servidor = app.listen(config.puerto, () => {
  console.log(`[api] Ferretería La Panameña escuchando en http://localhost:${config.puerto}`);
  console.log(`[api] Salud: http://localhost:${config.puerto}/api/salud`);
});

async function cerrar(senal) {
  console.log(`\n[api] Cerrando por ${senal}...`);
  servidor.close(async () => {
    await cerrarPool().catch(() => {});
    process.exit(0);
  });
}

process.on('SIGINT', () => cerrar('SIGINT'));
process.on('SIGTERM', () => cerrar('SIGTERM'));
