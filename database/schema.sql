-- ===========================================================================
-- Esquema de la base de datos: Ferretería La Panameña
-- PostgreSQL 18 (compatible con 14 o superior)
--
-- Uso desde una instalación nueva:
--   psql -U ferreteria_app -d ferreteria -f database/schema.sql
--   psql -U ferreteria_app -d ferreteria -f database/seed-catalogos.sql
--
-- El script es idempotente en lo esencial para facilitar reinstalaciones
-- controladas, pero no sustituye a un respaldo antes de modificar datos.
-- ===========================================================================

BEGIN;

-- Se usa pg_trgm para acelerar búsquedas con comodines (LIKE '%texto%').
-- Es una extensión incluida con PostgreSQL y marcada como "trusted".
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre            varchar(80) NOT NULL,
  nombre_normalizado varchar(80) NOT NULL,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT categorias_nombre_normalizado_unico UNIQUE (nombre_normalizado)
);

CREATE TABLE IF NOT EXISTS unidades_medida (
  id                       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre                   varchar(60) NOT NULL,
  nombre_normalizado       varchar(60) NOT NULL,
  abreviatura              varchar(12) NOT NULL,
  abreviatura_normalizada  varchar(12) NOT NULL,
  creado_en                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unidades_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT unidades_abreviatura_no_vacia CHECK (btrim(abreviatura) <> ''),
  CONSTRAINT unidades_nombre_normalizado_unico UNIQUE (nombre_normalizado),
  CONSTRAINT unidades_abreviatura_normalizada_unico UNIQUE (abreviatura_normalizada)
);

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo                 varchar(40),
  codigo_normalizado     varchar(40),
  nombre                 varchar(150) NOT NULL,
  nombre_normalizado     varchar(150) NOT NULL,
  descripcion            text,
  categoria_id           integer NOT NULL,
  unidad_referencia_id   integer NOT NULL,
  es_fraccionado         boolean NOT NULL DEFAULT false,
  estado                 varchar(10) NOT NULL DEFAULT 'activo',
  creado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_en         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT productos_categoria_fk
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT productos_unidad_fk
    FOREIGN KEY (unidad_referencia_id) REFERENCES unidades_medida (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT productos_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT productos_codigo_no_vacio CHECK (codigo IS NULL OR btrim(codigo) <> ''),
  CONSTRAINT productos_estado_valido CHECK (estado IN ('activo', 'inactivo')),
  CONSTRAINT productos_descripcion_longitud CHECK (descripcion IS NULL OR length(descripcion) <= 1000)
);

-- El código es opcional; cuando existe debe ser único sin distinguir
-- mayúsculas/minúsculas ni tildes. Un índice parcial permite varios NULL.
CREATE UNIQUE INDEX IF NOT EXISTS productos_codigo_unico
  ON productos (codigo_normalizado)
  WHERE codigo_normalizado IS NOT NULL;

CREATE INDEX IF NOT EXISTS productos_nombre_trgm
  ON productos USING gin (nombre_normalizado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_codigo_trgm
  ON productos USING gin (codigo_normalizado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_categoria_idx ON productos (categoria_id);
CREATE INDEX IF NOT EXISTS productos_unidad_referencia_idx ON productos (unidad_referencia_id);
CREATE INDEX IF NOT EXISTS productos_estado_idx ON productos (estado);
CREATE INDEX IF NOT EXISTS productos_creado_idx ON productos (creado_en DESC);
CREATE INDEX IF NOT EXISTS productos_fraccionado_idx ON productos (es_fraccionado) WHERE es_fraccionado;

-- ---------------------------------------------------------------------------
-- Unidades de comercialización adicionales
--
-- La unidad de referencia está en productos.unidad_referencia_id. Esta tabla
-- guarda las demás formas de venta (cubeta, carretillada, caja, etc.).
-- "equivalencia" significa: 1 unidad adicional = N unidades de referencia.
-- Se deja NULL cuando el negocio todavía no ha confirmado la conversión.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_unidades (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id      bigint NOT NULL,
  unidad_id        integer NOT NULL,
  equivalencia     numeric(14, 4),
  nota_equivalencia varchar(200),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT producto_unidades_producto_fk
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT producto_unidades_unidad_fk
    FOREIGN KEY (unidad_id) REFERENCES unidades_medida (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT producto_unidades_unica UNIQUE (producto_id, unidad_id),
  CONSTRAINT producto_unidades_equivalencia_positiva
    CHECK (equivalencia IS NULL OR equivalencia > 0),
  CONSTRAINT producto_unidades_nota_longitud
    CHECK (nota_equivalencia IS NULL OR length(nota_equivalencia) <= 200)
);

CREATE INDEX IF NOT EXISTS producto_unidades_unidad_idx ON producto_unidades (unidad_id);

-- ---------------------------------------------------------------------------
-- Marca de actualización automática
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_actualizar_marca ON productos;
CREATE TRIGGER productos_actualizar_marca
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_actualizado_en();

COMMIT;
