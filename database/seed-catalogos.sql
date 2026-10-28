-- ===========================================================================
-- Catálogos iniciales (categorías y unidades de medida)
-- No contiene productos ni datos comerciales inventados.
-- Ejecutar después de database/schema.sql:
--   psql -U ferreteria_app -d ferreteria -f database/seed-catalogos.sql
-- ===========================================================================

BEGIN;

INSERT INTO categorias (nombre, nombre_normalizado) VALUES
  ('Herramientas manuales', 'herramientas manuales'),
  ('Herramientas eléctricas', 'herramientas electricas'),
  ('Materiales de construcción', 'materiales de construccion'),
  ('Áridos y agregados', 'aridos y agregados'),
  ('Plomería', 'plomeria'),
  ('Electricidad', 'electricidad'),
  ('Pinturas y acabados', 'pinturas y acabados'),
  ('Tornillería y fijaciones', 'tornilleria y fijaciones'),
  ('Jardín y exteriores', 'jardin y exteriores'),
  ('Seguridad industrial', 'seguridad industrial'),
  ('Adhesivos y selladores', 'adhesivos y selladores'),
  ('Ferretería general', 'ferreteria general')
ON CONFLICT (nombre_normalizado) DO NOTHING;

-- Unidades genéricas de medida. No se definen equivalencias entre cubetas,
-- carretilladas y metros cúbicos: esas conversiones debe confirmarlas el
-- propietario de la ferretería.
INSERT INTO unidades_medida (nombre, nombre_normalizado, abreviatura, abreviatura_normalizada) VALUES
  ('Unidad', 'unidad', 'und', 'UND'),
  ('Pieza', 'pieza', 'pza', 'PZA'),
  ('Par', 'par', 'par', 'PAR'),
  ('Docena', 'docena', 'docena', 'DOCENA'),
  ('Ciento', 'ciento', 'ciento', 'CIENTO'),
  ('Millar', 'millar', 'millar', 'MILLAR'),
  ('Metro', 'metro', 'm', 'M'),
  ('Metro cuadrado', 'metro cuadrado', 'm²', 'M²'),
  ('Metro cúbico', 'metro cubico', 'm³', 'M³'),
  ('Centímetro', 'centimetro', 'cm', 'CM'),
  ('Milímetro', 'milimetro', 'mm', 'MM'),
  ('Pulgada', 'pulgada', 'pulg', 'PULG'),
  ('Pie', 'pie', 'pie', 'PIE'),
  ('Yarda', 'yarda', 'yd', 'YD'),
  ('Kilogramo', 'kilogramo', 'kg', 'KG'),
  ('Libra', 'libra', 'lb', 'LB'),
  ('Gramo', 'gramo', 'g', 'G'),
  ('Quintal', 'quintal', 'qq', 'QQ'),
  ('Litro', 'litro', 'L', 'L'),
  ('Galón', 'galon', 'gal', 'GAL'),
  ('Mililitro', 'mililitro', 'ml', 'ML'),
  ('Saco', 'saco', 'saco', 'SACO'),
  ('Bolsa', 'bolsa', 'bolsa', 'BOLSA'),
  ('Cubeta', 'cubeta', 'cubeta', 'CUBETA'),
  ('Carretillada', 'carretillada', 'carretilla', 'CARRETILLA'),
  ('Rollo', 'rollo', 'rollo', 'ROLLO'),
  ('Caja', 'caja', 'caja', 'CAJA')
ON CONFLICT (nombre_normalizado) DO NOTHING;

COMMIT;
