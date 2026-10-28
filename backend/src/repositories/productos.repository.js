// BITÁCORA (Etapa 3): todo el acceso a productos vive aquí. Las consultas usan
// parámetros ($1, $2...) y el orden se elige desde una lista blanca para evitar
// inyección SQL. La búsqueda se apoya en columnas normalizadas e índices GIN.
import { pool } from '../config/db.js';

const ORDENES = {
  nombre_asc: 'p.nombre_normalizado ASC, p.id ASC',
  nombre_desc: 'p.nombre_normalizado DESC, p.id DESC',
  codigo_asc: 'p.codigo_normalizado ASC NULLS LAST, p.nombre_normalizado ASC',
  reciente: 'p.creado_en DESC, p.id DESC',
};

export const ORDENES_VALIDOS = Object.keys(ORDENES);

const CAMPOS_PRODUCTO = `
  p.id,
  p.codigo,
  p.nombre,
  p.descripcion,
  p.es_fraccionado,
  p.estado,
  p.creado_en,
  p.actualizado_en,
  c.id AS categoria_id,
  c.nombre AS categoria_nombre,
  u.id AS unidad_id,
  u.nombre AS unidad_nombre,
  u.abreviatura AS unidad_abreviatura,
  (SELECT count(*) FROM producto_unidades pu WHERE pu.producto_id = p.id)::int AS unidades_adicionales
`;

function mapearProducto(fila) {
  return {
    id: Number(fila.id),
    codigo: fila.codigo,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    esFraccionado: fila.es_fraccionado,
    estado: fila.estado,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    unidadesAdicionales: fila.unidades_adicionales,
    categoria: {
      id: Number(fila.categoria_id),
      nombre: fila.categoria_nombre,
    },
    unidadReferencia: {
      id: Number(fila.unidad_id),
      nombre: fila.unidad_nombre,
      abreviatura: fila.unidad_abreviatura,
    },
  };
}

function construirFiltros({ busqueda, categoriaId, estado, fraccionado }) {
  const condiciones = [];
  const valores = [];

  if (busqueda) {
    valores.push(busqueda);
    const posicion = valores.length;
    condiciones.push(
      `(p.nombre_normalizado LIKE '%' || $${posicion} || '%' OR COALESCE(p.codigo_normalizado, '') ILIKE '%' || $${posicion} || '%')`,
    );
  }

  if (categoriaId) {
    valores.push(categoriaId);
    condiciones.push(`p.categoria_id = $${valores.length}`);
  }

  if (estado && estado !== 'todos') {
    valores.push(estado);
    condiciones.push(`p.estado = $${valores.length}`);
  }

  if (typeof fraccionado === 'boolean') {
    valores.push(fraccionado);
    condiciones.push(`p.es_fraccionado = $${valores.length}`);
  }

  return { condiciones, valores };
}

export async function buscarProductos(filtros) {
  const { condiciones, valores } = construirFiltros(filtros);
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const orden = ORDENES[filtros.orden] ?? ORDENES.nombre_asc;

  const consultaTotal = `SELECT count(*)::int AS total FROM productos p ${where}`;

  const valoresDatos = [...valores, filtros.limite, filtros.offset];
  const posicionLimite = valores.length + 1;
  const posicionOffset = valores.length + 2;

  const consultaDatos = `
    SELECT ${CAMPOS_PRODUCTO}
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    JOIN unidades_medida u ON u.id = p.unidad_referencia_id
    ${where}
    ORDER BY ${orden}
    LIMIT $${posicionLimite} OFFSET $${posicionOffset}
  `;

  const [resultadoTotal, resultadoDatos] = await Promise.all([
    pool.query(consultaTotal, valores),
    pool.query(consultaDatos, valoresDatos),
  ]);

  return {
    total: resultadoTotal.rows[0].total,
    productos: resultadoDatos.rows.map(mapearProducto),
  };
}

export async function obtenerProductoPorId(id) {
  const resultado = await pool.query(
    `
      SELECT ${CAMPOS_PRODUCTO}
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      JOIN unidades_medida u ON u.id = p.unidad_referencia_id
      WHERE p.id = $1
    `,
    [id],
  );

  if (resultado.rowCount === 0) return null;
  const producto = mapearProducto(resultado.rows[0]);

  const unidades = await pool.query(
    `
      SELECT pu.id, pu.unidad_id, u.nombre, u.abreviatura, pu.equivalencia, pu.nota_equivalencia
      FROM producto_unidades pu
      JOIN unidades_medida u ON u.id = pu.unidad_id
      WHERE pu.producto_id = $1
      ORDER BY u.nombre_normalizado ASC
    `,
    [id],
  );

  producto.unidadesComercializacion = unidades.rows.map((fila) => ({
    id: Number(fila.id),
    unidadId: Number(fila.unidad_id),
    nombre: fila.nombre,
    abreviatura: fila.abreviatura,
    equivalencia: fila.equivalencia === null ? null : Number(fila.equivalencia),
    notaEquivalencia: fila.nota_equivalencia,
  }));

  return producto;
}

export async function buscarPorCodigoNormalizado(codigoNormalizado) {
  const resultado = await pool.query(
    `
      SELECT p.id, p.nombre, p.codigo, p.estado, c.nombre AS categoria
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.codigo_normalizado = $1
      LIMIT 1
    `,
    [codigoNormalizado],
  );
  return resultado.rows[0] ?? null;
}

export async function buscarPosiblesDuplicados(nombreNormalizado, categoriaId) {
  const resultado = await pool.query(
    `
      SELECT p.id, p.nombre, p.codigo, p.estado, c.nombre AS categoria
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.nombre_normalizado = $1 AND p.categoria_id = $2
      ORDER BY p.id ASC
      LIMIT 5
    `,
    [nombreNormalizado, categoriaId],
  );

  return resultado.rows.map((fila) => ({
    id: Number(fila.id),
    nombre: fila.nombre,
    codigo: fila.codigo,
    estado: fila.estado,
    categoria: fila.categoria,
  }));
}

export async function crearProducto(datos) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const resultado = await cliente.query(
      `
        INSERT INTO productos (
          codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
          categoria_id, unidad_referencia_id, es_fraccionado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        datos.codigo,
        datos.codigoNormalizado,
        datos.nombre,
        datos.nombreNormalizado,
        datos.descripcion,
        datos.categoriaId,
        datos.unidadReferenciaId,
        datos.esFraccionado,
      ],
    );

    const productoId = Number(resultado.rows[0].id);

    for (const unidad of datos.unidadesComercializacion) {
      await cliente.query(
        `
          INSERT INTO producto_unidades (producto_id, unidad_id, equivalencia, nota_equivalencia)
          VALUES ($1, $2, $3, $4)
        `,
        [productoId, unidad.unidadId, unidad.equivalencia, unidad.notaEquivalencia],
      );
    }

    await cliente.query('COMMIT');
    return productoId;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function actualizarEstado(id, estado) {
  const resultado = await pool.query(
    `
      UPDATE productos
      SET estado = $2, actualizado_en = now()
      WHERE id = $1
      RETURNING id, estado, actualizado_en
    `,
    [id, estado],
  );

  if (resultado.rowCount === 0) return null;
  return {
    id: Number(resultado.rows[0].id),
    estado: resultado.rows[0].estado,
    actualizadoEn: resultado.rows[0].actualizado_en,
  };
}

export async function obtenerResumen() {
  const resultado = await pool.query(`
    SELECT
      (SELECT count(*) FROM productos)::int AS total,
      (SELECT count(*) FROM productos WHERE estado = 'activo')::int AS activos,
      (SELECT count(*) FROM productos WHERE estado = 'inactivo')::int AS inactivos,
      (SELECT count(*) FROM productos WHERE es_fraccionado)::int AS fraccionados,
      (SELECT count(*) FROM categorias)::int AS categorias,
      (SELECT count(*) FROM unidades_medida)::int AS unidades
  `);

  const fila = resultado.rows[0];
  return {
    total: fila.total,
    activos: fila.activos,
    inactivos: fila.inactivos,
    fraccionados: fila.fraccionados,
    categorias: fila.categorias,
    unidades: fila.unidades,
  };
}
