# Bitácora de desarrollo

Registro de decisiones, verificaciones y problemas corregidos. Las fechas corresponden al desarrollo inicial (octubre de 2026).

---

## 2026-10-27 — Análisis y alcance

Se revisó el pedido y se fijaron los límites:

- Catálogo de productos, no sistema de ventas ni inventario.
- Sin autenticación, usuarios ni roles.
- Sin precios, costos, existencias, proveedores ni movimientos.
- Sin datos comerciales inventados.
- Interfaz blanca con verde aqua, moderna y responsiva.
- Respaldo real y verificable.
- Documentación en español y comentarios `BITÁCORA` en el código.

Se decidió usar React + Vite en el frontend, Express en el backend y PostgreSQL, sin ORM ni librería de componentes. La razón: menos dependencias, SQL transparente y control total del diseño.

---

## 2026-10-27 — Entorno y PostgreSQL

El servicio PostgreSQL del equipo escuchaba en el puerto 5432, pero no se conocía la contraseña del superusuario. Para no modificar una instalación existente se creó un **clúster local independiente**:

- Carpeta: `.local/pgdata`.
- Puerto: **5433**.
- Superusuario: `postgres`; contraseña generada y guardada en `.local/postgres-password.txt`.
- Rol de aplicación: `ferreteria_app`.
- Bases: `ferreteria`, `ferreteria_test`, `ferreteria_restauracion`.

El script `scripts/local-db.ps1` automatiza la creación, el arranque, la detención y el estado. La contraseña real de la aplicación quedó solo en `.env`, excluido de Git.

**Decisión:** no se reutilizó la contraseña de `postgres` para la aplicación.

---

## 2026-10-27 — Esquema

Se diseñaron cuatro tablas:

- `categorias`
- `unidades_medida`
- `productos`
- `producto_unidades`

Decisiones clave:

- `productos.codigo` opcional, con índice único parcial.
- `nombre_normalizado` y `codigo_normalizado` para búsquedas sin tildes.
- `producto_unidades.equivalencia` nullable: `NULL` = pendiente de confirmar.
- `ON DELETE RESTRICT` en categorías/unidades para no romper productos.
- `ON DELETE CASCADE` en `producto_unidades` al borrar un producto.
- Trigger para `actualizado_en`.
- Índices GIN con `pg_trgm`.
- Restricciones `CHECK` para nombre, estado, longitudes y equivalencia positiva.

Se cargaron 12 categorías y 27 unidades. No se inventaron productos ni equivalencias.

---

## 2026-10-27 — Backend

Se implementó la API por capas:

```text
routes → controllers → services → repositories → pg Pool
```

Puntos importantes:

- Consultas parametrizadas en todo el SQL.
- Ordenamientos desde lista blanca.
- Validación de entrada en `producto.validator.js`.
- Errores centralizados en `ErrorAplicacion` y `manejadorErrores`.
- CORS y Helmet configurados.
- Express sirve `frontend/dist` si existe.
- `/api/salud` informa el estado de PostgreSQL.
- Respaldo real con `pg_dump` en formato *custom*.

Se agregó `asyncHandler` para no repetir `try/catch` en cada controlador.

---

## 2026-10-27 — Reglas de duplicados

Se optó por dos niveles:

1. **Código duplicado:** bloqueo duro (`409 CODIGO_DUPLICADO`). La base también lo impide con un índice único.
2. **Nombre duplicado:** advertencia suave (`409 POSIBLE_DUPLICADO`) solo si coincide exactamente (normalizado) y es la misma categoría. El usuario puede confirmar con `confirmarDuplicado: true`.

**Motivo:** una ferretería puede tener productos parecidos legítimos. Un `UNIQUE` en el nombre habría obligado a inventar sufijos.

---

## 2026-10-27 — Frontend

Se construyó con React 19, React Router 7 y CSS propio:

- Inicio con resumen y últimos productos.
- Buscar con parámetro `q`.
- Catálogo con filtros, orden y paginación.
- Detalle con unidades y equivalencias pendientes.
- Registro con creación inline de categorías y unidades.
- Diálogo de duplicados.
- Cambio de estado con confirmación.
- Página de respaldos.
- 404.
- Toasts y diálogo reutilizable.
- Paleta aqua/blanco, foco visible, enlace “Saltar al contenido”.

No se usó ninguna librería de componentes ni de iconos. Los iconos son SVG inline.

---

## 2026-10-27 — Primeras pruebas de API

Se verificó manualmente:

- Alta de producto.
- Detalle.
- Búsqueda con y sin tildes.
- Sin resultados.
- Validación.
- Código duplicado.
- Duplicado suave y confirmación.
- Paginación.
- Cambio de estado.
- Respaldo y descarga.
- Error de conexión con PostgreSQL apagado.

Se detectó que la búsqueda de códigos era sensible a mayúsculas en un caso. Se cambió la condición a `ILIKE` sobre `codigo_normalizado` y `LIKE` sobre `nombre_normalizado`.

---

## 2026-10-27 — Pruebas automatizadas

Se creó `backend/tests/api.test.js` con 13 pruebas de integración contra `ferreteria_test`.

Resultado:

```text
tests 13
pass 13
fail 0
```

Cubren salud, validación, alta fraccionada, códigos duplicados, duplicado suave, búsqueda con tildes, sin resultados, paginación, filtros, referencias inválidas, estado, 404 y respaldo real.

Las pruebas truncan productos antes de cada caso. Las categorías y unidades permanecen.

---

## 2026-10-27 — Respaldo y restauración

Se generó un respaldo real de prueba, se verificó con `pg_restore --list` y se restauró en `ferreteria_restauracion`. Los conteos coincidieron con la base de origen en ese momento (2 productos, 12 categorías, 27 unidades). Ese archivo se reemplazó después por un respaldo más reciente con los 8 productos `[DEMO]`.

Se documentó que la restauración **no** se ejecuta desde la interfaz. El script `restaurar.ps1` exige confirmación y permite elegir una base distinta.

---

## 2026-10-27 — Verificación en navegador y corrección de CORS

Al abrir la aplicación en el navegador integrado, el HTML cargaba pero sin estilos ni JavaScript. La consola mostraba:

```text
Refused to apply style ... MIME type ('application/json')
Failed to load resource: 403 (Forbidden)
```

**Causa:** Vite agrega `crossorigin` a los archivos compilados. El navegador enviaba `Origin: http://localhost:4000` incluso en solicitudes del mismo origen. CORS solo permitía `http://localhost:5173`, así que rechazaba CSS y JS.

**Corrección:** en `backend/src/config/env.js` se agregaron automáticamente `http://localhost:${PORT}` y `http://127.0.0.1:${PORT}` a los orígenes permitidos. Se reinició el backend y la página cargó sin errores.

Esta corrección es importante: sin ella, el frontend compilado no funciona en producción local aunque el build sea exitoso.

---

## 2026-10-27 — Verificación visual

Se revisaron:

- Inicio: resumen, accesos rápidos, últimos productos.
- Buscar: `tubo` devuelve 1 coincidencia.
- Catálogo: 8 productos, filtros, etiqueta “Fraccionado”.
- Detalle: unidad de referencia y equivalencias pendientes.
- Registro: alta real de “Producto de prueba UI” (ID 9).
- Duplicado: diálogo y confirmación (ID 10).
- Estado: desactivar y reactivar sin borrar.
- Respaldos: lista y descarga.
- 404.
- Móvil: render en iframe de 390 × 844 px, menú hamburguesa y búsqueda apilada.

Los productos temporales se eliminaron. La base quedó con 8 productos `[DEMO]`.

---

## 2026-10-27 — Persistencia

Se creó un producto temporal, se detuvo el backend, se inició de nuevo y se buscó el producto. Seguía existiendo con el mismo ID. Luego se eliminó.

**Conclusión:** los datos viven en PostgreSQL, no en memoria.

---

## 2026-10-27 — Ajustes finales

- Se reemplazó el puerto fijo `5432` del ejemplo de restauración por `<puerto>` y una nota.
- Se agregó `PG_RESTORE_PATH` a `.env.example`.
- Se alineó `DB_PORT` de `.env.example` con el clúster local (5433), con nota para usar 5432 si se prefiere el servicio normal.
- Se recompiló el frontend.
- Se volvieron a ejecutar las 13 pruebas: todas pasaron.
- Se generó un respaldo nuevo con los 8 productos `[DEMO]` (`ferreteria_20261027_164307.dump`, 17.858 bytes), se verificó con `pg_restore --list` y se restauró en `ferreteria_restauracion`; los conteos coincidieron (8 productos, 12 categorías, 27 unidades).

---

## Decisiones que se mantienen

| Tema | Decisión |
|---|---|
| ORM | No; SQL directo con `pg` |
| UI | CSS propio; sin librería |
| Autenticación | No; uso local |
| Borrado | No; estado activo/inactivo |
| Duplicado de nombre | Advertencia, no bloqueo |
| Equivalencias | Opcionales; no inventar |
| Respaldo | `pg_dump` real, formato custom |
| Restauración | Manual, con confirmación |
| Datos demo | Prefijo `[DEMO]`, opcionales |

---

## Pendiente

- Confirmar categorías, unidades y equivalencias con la ferretería.
- Decidir si se agrega edición de productos.
- Definir frecuencia y destino de respaldos.
- Evaluar importación CSV si el catálogo es grande.
- Agregar pruebas de interfaz y carga si el proyecto crece.
- Eliminar los datos `[DEMO]` antes de operar con datos reales.

Ver [PREGUNTAS_PENDIENTES.md](PREGUNTAS_PENDIENTES.md) para el detalle.
