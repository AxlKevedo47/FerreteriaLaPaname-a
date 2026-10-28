// Pruebas de integración de la API contra PostgreSQL.
// Requisitos: base ferreteria_test con database/schema.sql y seed-catalogos.sql.
// Ejecutar con: npm test (desde backend) o npm test (desde la raíz).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'ferreteria_test';
process.env.RESPALDO_DIR = '.local/backups-test';

const { crearApp } = await import('../src/app.js');
const { pool } = await import('../src/config/db.js');
const { config, RAIZ_PROYECTO } = await import('../src/config/env.js');

const app = crearApp();
let servidor;
let baseUrl;
let categoriaAridos;
let categoriaPlomeria;
let unidadMetroCubico;
let unidadCubeta;
let unidadUnidad;

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  const respuesta = await fetch(`${baseUrl}${ruta}`, opciones);
  const texto = await respuesta.text();
  return {
    estado: respuesta.status,
    cuerpo: texto ? JSON.parse(texto) : null,
  };
}

function productoBase(sobrescrituras = {}) {
  return {
    nombre: 'Arena de prueba',
    codigo: 'TEST-001',
    descripcion: 'Dato de prueba automatizado. No es información real.',
    categoriaId: categoriaAridos,
    unidadReferenciaId: unidadMetroCubico,
    esFraccionado: true,
    unidadesComercializacion: [
      {
        unidadId: unidadCubeta,
        equivalencia: null,
        notaEquivalencia: 'Equivalencia pendiente de confirmar.',
      },
    ],
    ...sobrescrituras,
  };
}

before(async () => {
  const categoria = await pool.query(
    "SELECT id FROM categorias WHERE nombre_normalizado = 'aridos y agregados' LIMIT 1",
  );
  const plomeria = await pool.query(
    "SELECT id FROM categorias WHERE nombre_normalizado = 'plomeria' LIMIT 1",
  );
  const metroCubico = await pool.query(
    "SELECT id FROM unidades_medida WHERE nombre_normalizado = 'metro cubico' LIMIT 1",
  );
  const cubeta = await pool.query(
    "SELECT id FROM unidades_medida WHERE nombre_normalizado = 'cubeta' LIMIT 1",
  );
  const unidad = await pool.query(
    "SELECT id FROM unidades_medida WHERE nombre_normalizado = 'unidad' LIMIT 1",
  );

  assert.ok(categoria.rowCount > 0, 'Falta el catálogo de categorías. Aplique seed-catalogos.sql.');
  assert.ok(metroCubico.rowCount > 0, 'Falta la unidad metro cúbico.');
  assert.ok(cubeta.rowCount > 0, 'Falta la unidad cubeta.');
  assert.ok(unidad.rowCount > 0, 'Falta la unidad unidad.');

  categoriaAridos = categoria.rows[0].id;
  categoriaPlomeria = plomeria.rows[0].id;
  unidadMetroCubico = metroCubico.rows[0].id;
  unidadCubeta = cubeta.rows[0].id;
  unidadUnidad = unidad.rows[0].id;

  await new Promise((resolver) => {
    servidor = app.listen(0, '127.0.0.1', resolver);
  });
  baseUrl = `http://127.0.0.1:${servidor.address().port}/api`;
});

beforeEach(async () => {
  await pool.query('TRUNCATE producto_unidades, productos RESTART IDENTITY CASCADE');
});

after(async () => {
  await new Promise((resolver) => servidor.close(resolver));
  await pool.end();
  await rm(path.join(RAIZ_PROYECTO, '.local', 'backups-test'), {
    recursive: true,
    force: true,
  }).catch(() => {});
});

test('la API informa su estado y la conexión a PostgreSQL', async () => {
  const respuesta = await pedir('/salud');
  assert.equal(respuesta.estado, 200);
  assert.equal(respuesta.cuerpo.estado, 'ok');
  assert.equal(respuesta.cuerpo.baseDatos, 'conectada');
});

test('rechaza un producto sin campos obligatorios', async () => {
  const respuesta = await pedir('/productos', { metodo: 'POST', cuerpo: {} });
  assert.equal(respuesta.estado, 400);
  assert.equal(respuesta.cuerpo.error.codigo, 'DATOS_INVALIDOS');
  assert.ok(respuesta.cuerpo.error.detalles.nombre);
  assert.ok(respuesta.cuerpo.error.detalles.categoriaId);
  assert.ok(respuesta.cuerpo.error.detalles.unidadReferenciaId);
});

test('registra un producto fraccionado y lo devuelve en el detalle', async () => {
  const creado = await pedir('/productos', { metodo: 'POST', cuerpo: productoBase() });
  assert.equal(creado.estado, 201);
  assert.equal(creado.cuerpo.datos.nombre, 'Arena de prueba');
  assert.equal(creado.cuerpo.datos.estado, 'activo');
  assert.equal(creado.cuerpo.datos.esFraccionado, true);
  assert.equal(creado.cuerpo.datos.unidadesComercializacion.length, 1);
  assert.equal(creado.cuerpo.datos.unidadesComercializacion[0].equivalencia, null);

  const detalle = await pedir(`/productos/${creado.cuerpo.datos.id}`);
  assert.equal(detalle.estado, 200);
  assert.equal(detalle.cuerpo.datos.codigo, 'TEST-001');
  assert.equal(detalle.cuerpo.datos.categoria.nombre, 'Áridos y agregados');
  assert.equal(detalle.cuerpo.datos.unidadReferencia.abreviatura, 'm³');
  assert.equal(detalle.cuerpo.datos.unidadesComercializacion.length, 1);
});

test('detecta códigos duplicados sin distinguir mayúsculas', async () => {
  await pedir('/productos', { metodo: 'POST', cuerpo: productoBase() });
  const duplicado = await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({ nombre: 'Otro producto', codigo: 'test-001' }),
  });

  assert.equal(duplicado.estado, 409);
  assert.equal(duplicado.cuerpo.error.codigo, 'CODIGO_DUPLICADO');
});

test('advierte un posible duplicado por nombre y permite confirmarlo', async () => {
  await pedir('/productos', { metodo: 'POST', cuerpo: productoBase() });

  const advertencia = await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({ codigo: 'TEST-002', nombre: 'ARENA DE PRUEBA' }),
  });
  assert.equal(advertencia.estado, 409);
  assert.equal(advertencia.cuerpo.error.codigo, 'POSIBLE_DUPLICADO');
  assert.equal(advertencia.cuerpo.error.detalles.duplicados.length, 1);

  const confirmado = await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({
      codigo: 'TEST-002',
      nombre: 'ARENA DE PRUEBA',
      confirmarDuplicado: true,
    }),
  });
  assert.equal(confirmado.estado, 201);
  assert.equal(confirmado.cuerpo.datos.nombre, 'ARENA DE PRUEBA');
});

test('busca por nombre y código sin distinguir mayúsculas ni tildes', async () => {
  await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({ nombre: 'Tubería de prueba', codigo: 'TUB-001' }),
  });

  const porNombre = await pedir('/productos?busqueda=tuberia');
  assert.equal(porNombre.estado, 200);
  assert.equal(porNombre.cuerpo.paginacion.total, 1);
  assert.equal(porNombre.cuerpo.datos[0].nombre, 'Tubería de prueba');

  const porMayusculas = await pedir('/productos?busqueda=TUBER%C3%8DA');
  assert.equal(porMayusculas.cuerpo.paginacion.total, 1);

  const porCodigo = await pedir('/productos?busqueda=TUB-00');
  assert.equal(porCodigo.cuerpo.paginacion.total, 1);
});

test('informa cuando no hay coincidencias', async () => {
  const respuesta = await pedir('/productos?busqueda=producto-que-no-existe');
  assert.equal(respuesta.estado, 200);
  assert.equal(respuesta.cuerpo.paginacion.total, 0);
  assert.deepEqual(respuesta.cuerpo.datos, []);
});

test('pagina los resultados del catálogo', async () => {
  for (let indice = 1; indice <= 3; indice += 1) {
    const respuesta = await pedir('/productos', {
      metodo: 'POST',
      cuerpo: productoBase({
        nombre: `Producto de prueba ${indice}`,
        codigo: `PAG-00${indice}`,
      }),
    });
    assert.equal(respuesta.estado, 201);
  }

  const segundaPagina = await pedir('/productos?porPagina=2&pagina=2');
  assert.equal(segundaPagina.estado, 200);
  assert.equal(segundaPagina.cuerpo.paginacion.total, 3);
  assert.equal(segundaPagina.cuerpo.paginacion.totalPaginas, 2);
  assert.equal(segundaPagina.cuerpo.paginacion.tieneAnterior, true);
  assert.equal(segundaPagina.cuerpo.paginacion.tieneSiguiente, false);
  assert.equal(segundaPagina.cuerpo.datos.length, 1);
});

test('filtra por categoría y por estado', async () => {
  await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({ nombre: 'Arena de prueba', codigo: 'FIL-001' }),
  });
  await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({
      nombre: 'Tubo de prueba',
      codigo: 'FIL-002',
      categoriaId: categoriaPlomeria,
      unidadReferenciaId: unidadUnidad,
      esFraccionado: false,
      unidadesComercializacion: [],
    }),
  });

  const porCategoria = await pedir(`/productos?categoria=${categoriaPlomeria}`);
  assert.equal(porCategoria.cuerpo.paginacion.total, 1);
  assert.equal(porCategoria.cuerpo.datos[0].nombre, 'Tubo de prueba');

  const activos = await pedir('/productos?estado=activo');
  assert.equal(activos.cuerpo.paginacion.total, 2);

  const inactivos = await pedir('/productos?estado=inactivo');
  assert.equal(inactivos.cuerpo.paginacion.total, 0);
});

test('valida referencias inexistentes', async () => {
  const respuesta = await pedir('/productos', {
    metodo: 'POST',
    cuerpo: productoBase({ categoriaId: 999999 }),
  });
  assert.equal(respuesta.estado, 400);
  assert.equal(respuesta.cuerpo.error.codigo, 'DATOS_INVALIDOS');
  assert.ok(respuesta.cuerpo.error.detalles.categoriaId);
});

test('cambia el estado de un producto sin eliminarlo', async () => {
  const creado = await pedir('/productos', { metodo: 'POST', cuerpo: productoBase() });
  const id = creado.cuerpo.datos.id;

  const desactivado = await pedir(`/productos/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado: 'inactivo' },
  });
  assert.equal(desactivado.estado, 200);
  assert.equal(desactivado.cuerpo.datos.estado, 'inactivo');

  const detalle = await pedir(`/productos/${id}`);
  assert.equal(detalle.cuerpo.datos.estado, 'inactivo');

  const reactivado = await pedir(`/productos/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado: 'activo' },
  });
  assert.equal(reactivado.cuerpo.datos.estado, 'activo');
});

test('devuelve 404 para un producto inexistente y para rutas desconocidas', async () => {
  const producto = await pedir('/productos/999999');
  assert.equal(producto.estado, 404);
  assert.equal(producto.cuerpo.error.codigo, 'NO_ENCONTRADO');

  const ruta = await pedir('/ruta-que-no-existe');
  assert.equal(ruta.estado, 404);
  assert.equal(ruta.cuerpo.error.codigo, 'NO_ENCONTRADO');
});

test('crea un respaldo real con pg_dump y lo lista', async (contexto) => {
  if (!existsSync(config.respaldo.pgDump)) {
    contexto.skip(`pg_dump no está disponible en ${config.respaldo.pgDump}`);
    return;
  }

  const creado = await pedir('/respaldos', { metodo: 'POST' });
  assert.equal(creado.estado, 201);
  assert.match(creado.cuerpo.datos.nombre, /^ferreteria_\d{8}_\d{6}(?:_\d+)?\.dump$/);
  assert.ok(creado.cuerpo.datos.tamano > 0);

  const ruta = path.join(RAIZ_PROYECTO, '.local', 'backups-test', creado.cuerpo.datos.nombre);
  assert.equal(existsSync(ruta), true);

  const lista = await pedir('/respaldos');
  assert.equal(lista.estado, 200);
  assert.ok(lista.cuerpo.datos.some((item) => item.nombre === creado.cuerpo.datos.nombre));
});
