import { pool } from '../config/db.js';

export async function listarCategorias() {
  const resultado = await pool.query(`
    SELECT c.id, c.nombre, count(p.id)::int AS productos
    FROM categorias c
    LEFT JOIN productos p ON p.categoria_id = c.id
    GROUP BY c.id, c.nombre
    ORDER BY c.nombre_normalizado ASC
  `);

  return resultado.rows.map((fila) => ({
    id: Number(fila.id),
    nombre: fila.nombre,
    productos: fila.productos,
  }));
}

export async function buscarCategoriaPorId(id) {
  const resultado = await pool.query('SELECT id, nombre FROM categorias WHERE id = $1', [id]);
  if (resultado.rowCount === 0) return null;
  return { id: Number(resultado.rows[0].id), nombre: resultado.rows[0].nombre };
}

export async function buscarCategoriaPorNombreNormalizado(nombreNormalizado) {
  const resultado = await pool.query(
    'SELECT id, nombre FROM categorias WHERE nombre_normalizado = $1',
    [nombreNormalizado],
  );
  if (resultado.rowCount === 0) return null;
  return { id: Number(resultado.rows[0].id), nombre: resultado.rows[0].nombre };
}

export async function crearCategoria({ nombre, nombreNormalizado }) {
  const resultado = await pool.query(
    `
      INSERT INTO categorias (nombre, nombre_normalizado)
      VALUES ($1, $2)
      RETURNING id, nombre
    `,
    [nombre, nombreNormalizado],
  );
  return { id: Number(resultado.rows[0].id), nombre: resultado.rows[0].nombre };
}

export async function listarUnidades() {
  const resultado = await pool.query(`
    SELECT u.id, u.nombre, u.abreviatura, count(DISTINCT p.id)::int AS productos
    FROM unidades_medida u
    LEFT JOIN productos p ON p.unidad_referencia_id = u.id
    GROUP BY u.id, u.nombre, u.abreviatura
    ORDER BY u.nombre_normalizado ASC
  `);

  return resultado.rows.map((fila) => ({
    id: Number(fila.id),
    nombre: fila.nombre,
    abreviatura: fila.abreviatura,
    productos: fila.productos,
  }));
}

export async function buscarUnidadPorId(id) {
  const resultado = await pool.query(
    'SELECT id, nombre, abreviatura FROM unidades_medida WHERE id = $1',
    [id],
  );
  if (resultado.rowCount === 0) return null;
  return {
    id: Number(resultado.rows[0].id),
    nombre: resultado.rows[0].nombre,
    abreviatura: resultado.rows[0].abreviatura,
  };
}

export async function buscarUnidadPorNombreNormalizado(nombreNormalizado) {
  const resultado = await pool.query(
    'SELECT id, nombre, abreviatura FROM unidades_medida WHERE nombre_normalizado = $1',
    [nombreNormalizado],
  );
  if (resultado.rowCount === 0) return null;
  return {
    id: Number(resultado.rows[0].id),
    nombre: resultado.rows[0].nombre,
    abreviatura: resultado.rows[0].abreviatura,
  };
}

export async function crearUnidad({ nombre, nombreNormalizado, abreviatura, abreviaturaNormalizada }) {
  const resultado = await pool.query(
    `
      INSERT INTO unidades_medida (nombre, nombre_normalizado, abreviatura, abreviatura_normalizada)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, abreviatura
    `,
    [nombre, nombreNormalizado, abreviatura, abreviaturaNormalizada],
  );
  return {
    id: Number(resultado.rows[0].id),
    nombre: resultado.rows[0].nombre,
    abreviatura: resultado.rows[0].abreviatura,
  };
}
