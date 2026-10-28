-- ===========================================================================
-- DATOS DE DEMOSTRACIÓN — NO SON INFORMACIÓN REAL DE LA FERRETERÍA
--
-- Todos los productos llevan el prefijo [DEMO] y códigos DEMO-###.
-- Se incluyen tres productos fraccionados para mostrar el modelo de unidades.
-- Las equivalencias entre cubeta/carretillada y metro cúbico se dejan sin
-- valor a propósito: el negocio debe confirmarlas.
--
-- Uso opcional después de schema.sql y seed-catalogos.sql:
--   psql -U ferreteria_app -d ferreteria -f database/seed-demo.sql
-- ===========================================================================

BEGIN;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-001', 'DEMO-001', '[DEMO] Arena fina', '[demo] arena fina',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, true
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'aridos y agregados' AND u.nombre_normalizado = 'metro cubico'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-002', 'DEMO-002', '[DEMO] Grava triturada', '[demo] grava triturada',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, true
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'aridos y agregados' AND u.nombre_normalizado = 'metro cubico'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-003', 'DEMO-003', '[DEMO] Tierra blanca', '[demo] tierra blanca',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, true
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'aridos y agregados' AND u.nombre_normalizado = 'metro cubico'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-004', 'DEMO-004', '[DEMO] Martillo de uña', '[demo] martillo de una',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, false
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'herramientas manuales' AND u.nombre_normalizado = 'unidad'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-005', 'DEMO-005', '[DEMO] Taladro percutor', '[demo] taladro percutor',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, false
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'herramientas electricas' AND u.nombre_normalizado = 'unidad'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-006', 'DEMO-006', '[DEMO] Tubo PVC 1/2 pulgada', '[demo] tubo pvc 1/2 pulgada',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, false
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'plomeria' AND u.nombre_normalizado = 'metro'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-007', 'DEMO-007', '[DEMO] Pintura blanca', '[demo] pintura blanca',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, false
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'pinturas y acabados' AND u.nombre_normalizado = 'galon'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

INSERT INTO productos (
  codigo, codigo_normalizado, nombre, nombre_normalizado, descripcion,
  categoria_id, unidad_referencia_id, es_fraccionado
)
SELECT 'DEMO-008', 'DEMO-008', '[DEMO] Tornillo autorroscante', '[demo] tornillo autorroscante',
       'Producto de demostración. No representa existencias ni precios reales.',
       c.id, u.id, false
FROM categorias c, unidades_medida u
WHERE c.nombre_normalizado = 'tornilleria y fijaciones' AND u.nombre_normalizado = 'ciento'
ON CONFLICT (codigo_normalizado) WHERE codigo_normalizado IS NOT NULL DO NOTHING;

-- Unidades de comercialización de los productos fraccionados. Sin equivalencia
-- numérica porque no ha sido confirmada por el negocio.
INSERT INTO producto_unidades (producto_id, unidad_id, equivalencia, nota_equivalencia)
SELECT p.id, u.id, NULL, 'Equivalencia pendiente de confirmar con el negocio.'
FROM productos p, unidades_medida u
WHERE p.codigo IN ('DEMO-001', 'DEMO-002', 'DEMO-003')
  AND u.nombre_normalizado IN ('cubeta', 'carretillada')
ON CONFLICT (producto_id, unidad_id) DO NOTHING;

COMMIT;
