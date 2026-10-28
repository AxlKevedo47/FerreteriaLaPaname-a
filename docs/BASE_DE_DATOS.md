# Base de datos

## 1. Motor y configuración

- **PostgreSQL 14 o superior.** Verificado con PostgreSQL 18.6.
- Codificación `UTF8`.
- Extensión `pg_trgm` para índices de búsqueda con comodines.
- Base principal: `ferreteria`.
- Base de pruebas: `ferreteria_test`.
- Base sugerida para restauración: `ferreteria_restauracion`.

El esquema está en [`database/schema.sql`](../database/schema.sql) y los catálogos iniciales en [`database/seed-catalogos.sql`](../database/seed-catalogos.sql).

## 2. Diagrama

```text
┌──────────────────┐
│ categorias       │
│ id (PK)          │
│ nombre           │
│ nombre_normalizado (UQ)
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────────────────┐        ┌──────────────────────────┐
│ productos                    │  N   1 │ unidades_medida          │
│ id (PK)                      ├───────►│ id (PK)                  │
│ codigo (opcional, UQ parcial)│        │ nombre (UQ normalizado)  │
│ nombre                       │        │ abreviatura (UQ normal.) │
│ descripcion                  │        └──────────┬───────────────┘
│ categoria_id (FK)            │                   │ 1
│ unidad_referencia_id (FK)    │                   │
│ es_fraccionado               │                   │ N
│ estado                       │        ┌──────────▼───────────────┐
│ creado_en / actualizado_en   │ 1    N │ producto_unidades        │
└──────────┬───────────────────┘◄───────┤ producto_id (FK)         │
           │                           │ unidad_id (FK)            │
           │                           │ equivalencia (nullable)   │
           │                           │ nota_equivalencia         │
           │                           └───────────────────────────┘
           └── trigger: actualiza actualizado_en
```

## 3. Tablas

### 3.1 `categorias`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `integer` | Identidad, PK |
| `nombre` | `varchar(80)` | No vacío |
| `nombre_normalizado` | `varchar(80)` | Único, no vacío |
| `creado_en` | `timestamptz` | Por defecto `now()` |

Restricciones:

- `categorias_nombre_no_vacio`: `btrim(nombre) <> ''`.
- `categorias_nombre_normalizado_unico`: `UNIQUE (nombre_normalizado)`.

### 3.2 `unidades_medida`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `integer` | Identidad, PK |
| `nombre` | `varchar(60)` | No vacío |
| `nombre_normalizado` | `varchar(60)` | Único |
| `abreviatura` | `varchar(12)` | No vacía |
| `abreviatura_normalizada` | `varchar(12)` | Única |
| `creado_en` | `timestamptz` | Por defecto `now()` |

### 3.3 `productos`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `bigint` | Identidad, PK |
| `codigo` | `varchar(40)` | Opcional; si existe, no vacío |
| `codigo_normalizado` | `varchar(40)` | Único parcial cuando no es `NULL` |
| `nombre` | `varchar(150)` | Obligatorio, no vacío |
| `nombre_normalizado` | `varchar(150)` | Obligatorio; se usa para buscar y comparar |
| `descripcion` | `text` | Opcional, máximo 1000 caracteres |
| `categoria_id` | `integer` | FK a `categorias`, obligatoria |
| `unidad_referencia_id` | `integer` | FK a `unidades_medida`, obligatoria |
| `es_fraccionado` | `boolean` | Por defecto `false` |
| `estado` | `varchar(10)` | `activo` o `inactivo`; por defecto `activo` |
| `creado_en` | `timestamptz` | Por defecto `now()` |
| `actualizado_en` | `timestamptz` | Por defecto `now()`; trigger en cada `UPDATE` |

Restricciones:

- `productos_categoria_fk`: `ON UPDATE CASCADE ON DELETE RESTRICT`.
- `productos_unidad_fk`: `ON UPDATE CASCADE ON DELETE RESTRICT`.
- `productos_nombre_no_vacio`.
- `productos_codigo_no_vacio`.
- `productos_estado_valido`: `estado IN ('activo','inactivo')`.
- `productos_descripcion_longitud`: máximo 1000.

> `ON DELETE RESTRICT` impide borrar una categoría o unidad que esté en uso. Es intencional: protege la integridad del catálogo.

### 3.4 `producto_unidades`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `bigint` | Identidad, PK |
| `producto_id` | `bigint` | FK a `productos`, `ON DELETE CASCADE` |
| `unidad_id` | `integer` | FK a `unidades_medida`, `ON DELETE RESTRICT` |
| `equivalencia` | `numeric(14,4)` | Opcional; si existe, mayor que 0 |
| `nota_equivalencia` | `varchar(200)` | Opcional |
| `creado_en` | `timestamptz` | Por defecto `now()` |

Restricciones:

- `producto_unidades_unica`: `UNIQUE (producto_id, unidad_id)` — no se repite la misma unidad en un producto.
- `producto_unidades_equivalencia_positiva`: `NULL` o `> 0`.
- `producto_unidades_nota_longitud`: máximo 200.

**Semántica de `equivalencia`:** `1 unidad adicional = N unidades de referencia`.

Ejemplo:

```text
Producto: Arena fina
Unidad de referencia: Metro cúbico (m³)
Unidad adicional: Cubeta
equivalencia = 0.035  → 1 cubeta = 0.035 m³
```

Si el negocio no ha confirmado la conversión, `equivalencia` queda `NULL`. La interfaz muestra “Equivalencia pendiente de confirmar”. **No se debe inventar.**

## 4. Índices

| Índice | Tipo | Uso |
|---|---|---|
| `productos_codigo_unico` | Único parcial | Evita códigos repetidos; permite varios `NULL` |
| `productos_nombre_trgm` | GIN `gin_trgm_ops` | Acelera `LIKE '%texto%'` sobre nombre normalizado |
| `productos_codigo_trgm` | GIN `gin_trgm_ops` | Acelera búsquedas por código |
| `productos_categoria_idx` | B-tree | Filtro por categoría |
| `productos_unidad_referencia_idx` | B-tree | Filtro/unión por unidad |
| `productos_estado_idx` | B-tree | Filtro por estado |
| `productos_creado_idx` | B-tree `DESC` | Orden por más reciente |
| `productos_fraccionado_idx` | B-tree parcial | Filtro de fraccionados |
| `producto_unidades_unidad_idx` | B-tree | Unión por unidad |

### ¿Por qué `pg_trgm`?

`LIKE '%arena%'` no puede usar un índice B-tree normal porque el comodín está al inicio. `pg_trgm` indexa trigramas y permite búsquedas `LIKE`/`ILIKE` rápidas. Es una extensión incluida en PostgreSQL y marcada como *trusted*, por lo que el usuario dueño de la base puede crearla.

## 5. Normalización

La función `normalizarTexto` del backend:

```js
String(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
```

Se aplica al guardar (`nombre_normalizado`, `codigo_normalizado`) y al buscar. Por eso:

- `Tubería` = `tuberia` = `TUBERÍA`.
- `Arena  fina` = `arena fina`.
- `Pintura blanca` ≠ `Pintura blanca mate` (son nombres distintos; el segundo no se bloquea).

El código se normaliza además con `.toUpperCase()`.

## 6. Reglas de duplicados

### 6.1 Código duplicado (duro)

- Se busca `codigo_normalizado` exacto.
- Si existe, la API responde `409 CODIGO_DUPLICADO`.
- La base también lo impide con `productos_codigo_unico`.
- El mensaje incluye el producto existente para que el usuario lo revise.

### 6.2 Nombre duplicado (suave)

- Se busca `nombre_normalizado` exacto **y** la misma `categoria_id`.
- Si hay coincidencias y el cliente no envió `confirmarDuplicado: true`, la API responde `409 POSIBLE_DUPLICADO` con hasta 5 coincidencias.
- El usuario puede cancelar o confirmar. Al confirmar, se inserta el producto.
- No se bloquean nombres parecidos ni productos de otra categoría.

### 6.3 ¿Por qué no un `UNIQUE` en el nombre?

Porque una ferretería puede tener legítimamente dos productos con el mismo nombre en categorías distintas, o variantes que el negocio considera diferentes. Un `UNIQUE` rígido obligaría a inventar sufijos y empeoraría la calidad del catálogo.

## 7. Consultas de ejemplo

### Buscar por nombre o código

```sql
SELECT p.id, p.codigo, p.nombre, c.nombre AS categoria
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.nombre_normalizado LIKE '%' || $1 || '%'
   OR COALESCE(p.codigo_normalizado, '') ILIKE '%' || $1 || '%'
ORDER BY p.nombre_normalizado
LIMIT 20 OFFSET 0;
```

### Productos fraccionados con sus unidades

```sql
SELECT
  p.nombre,
  ur.nombre AS unidad_referencia,
  ua.nombre AS unidad_adicional,
  pu.equivalencia
FROM productos p
JOIN unidades_medida ur ON ur.id = p.unidad_referencia_id
LEFT JOIN producto_unidades pu ON pu.producto_id = p.id
LEFT JOIN unidades_medida ua ON ua.id = pu.unidad_id
WHERE p.es_fraccionado
ORDER BY p.nombre, ua.nombre;
```

### Posibles duplicados por nombre y categoría

```sql
SELECT p.id, p.nombre, c.nombre AS categoria
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.nombre_normalizado = $1
  AND p.categoria_id = $2
ORDER BY p.id;
```

### Conteo para el resumen

```sql
SELECT
  (SELECT count(*) FROM productos)::int AS total,
  (SELECT count(*) FROM productos WHERE estado = 'activo')::int AS activos,
  (SELECT count(*) FROM productos WHERE estado = 'inactivo')::int AS inactivos,
  (SELECT count(*) FROM productos WHERE es_fraccionado)::int AS fraccionados,
  (SELECT count(*) FROM categorias)::int AS categorias,
  (SELECT count(*) FROM unidades_medida)::int AS unidades;
```

## 8. Rendimiento con 3.000+ productos

- La paginación limita la respuesta a 20 filas por defecto (máximo 100).
- Los filtros usan índices B-tree.
- La búsqueda usa índices GIN de trigramas.
- El conteo total se ejecuta en paralelo con la consulta de datos (`Promise.all`).
- No se hacen consultas N+1 en el listado: categoría y unidad se unen en la misma consulta.
- El detalle hace una segunda consulta solo para las unidades adicionales.

Para cargas masivas se recomienda:

1. Generar un respaldo.
2. Insertar en una transacción.
3. Ejecutar `ANALYZE` al finalizar.
4. Verificar conteos y búsquedas.

## 9. Catálogos iniciales

`seed-catalogos.sql` carga:

- **12 categorías:** Herramientas manuales, Herramientas eléctricas, Materiales de construcción, Áridos y agregados, Plomería, Electricidad, Pinturas y acabados, Tornillería y fijaciones, Jardín y exteriores, Seguridad industrial, Adhesivos y selladores, Ferretería general.
- **27 unidades:** Unidad, Pieza, Par, Docena, Ciento, Millar, Metro, Metro cuadrado, Metro cúbico, Centímetro, Milímetro, Pulgada, Pie, Yarda, Kilogramo, Libra, Gramo, Quintal, Litro, Galón, Mililitro, Saco, Bolsa, Cubeta, Carretillada, Rollo, Caja.

No se definen equivalencias entre unidades. Esas conversiones debe confirmarlas el negocio.

## 10. Datos de demostración

`seed-demo.sql` es opcional. Carga 8 productos con prefijo `[DEMO]` y códigos `DEMO-001` a `DEMO-008`. Tres son fraccionados.

Para eliminarlos de forma segura:

```sql
BEGIN;
DELETE FROM productos WHERE codigo LIKE 'DEMO-%' AND nombre LIKE '[DEMO]%';
COMMIT;
```

> No ejecute `TRUNCATE` sobre una base con datos reales. Si necesita reiniciar una base de prueba, hágalo solo en `ferreteria_test` o en una base desechable.

## 11. Base de pruebas

`ferreteria_test` debe tener el esquema y los catálogos, pero **no** los datos de demostración. Las pruebas truncan `producto_unidades` y `productos` antes de cada caso y dejan las categorías/unidades intactas.

Preparación:

```powershell
$env:PGPASSWORD = "su_contrasena"
psql -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria_test -f database/schema.sql
psql -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria_test -f database/seed-catalogos.sql
Remove-Item Env:PGPASSWORD
```

## 12. Cambios futuros

No hay framework de migraciones. Para modificar el esquema:

1. Genere un respaldo verificado.
2. Cree un script nuevo (`database/migracion_XXX.sql`) en lugar de editar el esquema ya aplicado.
3. Aplíquelo en `ferreteria_test` primero.
4. Ejecute las pruebas.
5. Aplíquelo en producción.
6. Actualice esta documentación.

`schema.sql` es idempotente en lo esencial (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), pero no debe usarse como sustituto de una migración planificada.
