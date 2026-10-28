# Pruebas y verificación

## 1. Entorno verificado

| Componente | Versión |
|---|---|
| Windows | 11 |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| PostgreSQL | 18.6 (compilado para Windows x64) |
| React | 19.3.1 |
| React Router | 7.18.5 |
| Vite | 8.3.5 |
| Express | 5.3.0 |
| pg | 8.23.1 |

Base principal: `ferreteria` en `127.0.0.1:5433`.
Base de pruebas: `ferreteria_test`.
Base de restauración: `ferreteria_restauracion`.

---

## 2. Pruebas automatizadas

### 2.1 Cómo ejecutarlas

Requisito: `ferreteria_test` debe tener aplicados `database/schema.sql` y `database/seed-catalogos.sql`.

```powershell
npm.cmd test
```

El comando ejecuta:

```text
node --test --test-concurrency=1 tests/api.test.js
```

Las pruebas levantan la app Express en un puerto efímero y usan PostgreSQL real. No usan mocks de base de datos.

### 2.2 Resultado

```text
✔ la API informa su estado y la conexión a PostgreSQL
✔ rechaza un producto sin campos obligatorios
✔ registra un producto fraccionado y lo devuelve en el detalle
✔ detecta códigos duplicados sin distinguir mayúsculas
✔ advierte un posible duplicado por nombre y permite confirmarlo
✔ busca por nombre y código sin distinguir mayúsculas ni tildes
✔ informa cuando no hay coincidencias
✔ pagina los resultados del catálogo
✔ filtra por categoría y por estado
✔ valida referencias inexistentes
✔ cambia el estado de un producto sin eliminarlo
✔ devuelve 404 para un producto inexistente y para rutas desconocidas
✔ crea un respaldo real con pg_dump y lo lista

ℹ tests 13
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 2210.1905
```

**13 de 13 pruebas aprobadas.**

### 2.3 Qué cubre cada prueba

| # | Prueba | Verifica |
|---|---|---|
| 1 | Salud | `/api/salud` responde `ok` y `baseDatos: conectada` |
| 2 | Validación | Un producto sin campos obligatorios devuelve `400 DATOS_INVALIDOS` con detalles |
| 3 | Alta fraccionada | Crea producto con unidad de referencia, unidad adicional y equivalencia nula; el detalle las devuelve |
| 4 | Código duplicado | `test-001` y `TEST-001` colisionan; devuelve `409 CODIGO_DUPLICADO` |
| 5 | Duplicado suave | Mismo nombre + categoría devuelve `409 POSIBLE_DUPLICADO`; con `confirmarDuplicado: true` se crea |
| 6 | Búsqueda | Encuentra por nombre y código con mayúsculas, minúsculas y tildes |
| 7 | Sin resultados | Devuelve lista vacía y paginación en cero, no un error |
| 8 | Paginación | `porPagina=1&pagina=2` devuelve el segundo producto y metadatos correctos |
| 9 | Filtros | Filtra por categoría y por estado |
| 10 | Referencias | Categoría o unidad inexistente devuelve `400` |
| 11 | Estado | `PATCH /:id/estado` desactiva y reactiva sin borrar |
| 12 | 404 | Producto inexistente y ruta desconocida devuelven `404` |
| 13 | Respaldo | `POST /api/respaldos` genera un archivo real, no vacío, y `GET` lo lista |

### 2.4 Limpieza

Cada prueba trunca `producto_unidades` y `productos` en `ferreteria_test` antes de ejecutarse. Las categorías y unidades permanecen. La base de pruebas queda sin productos al terminar.

Los respaldos de prueba se guardan en `.local/backups-test` (excluido de Git).

---

## 3. Verificación manual de la API

Además de la suite, se probó manualmente con `Invoke-RestMethod` y `curl`:

| Caso | Resultado |
|---|---|
| `GET /api/salud` | `200`, base conectada |
| `POST /api/productos` con datos válidos | `201`, producto con ID |
| `GET /api/productos/:id` | `200`, detalle con categoría, unidad y unidades adicionales |
| `GET /api/productos?busqueda=arena` | `200`, coincidencia |
| `GET /api/productos?busqueda=ARENA` | `200`, misma coincidencia |
| `GET /api/productos?busqueda=tuberia` | `200`, encuentra “Tubería” |
| `GET /api/productos?busqueda=TUBERÍA` | `200`, misma coincidencia |
| `GET /api/productos?busqueda=zzzz-no-existe` | `200`, lista vacía |
| `POST` sin nombre | `400`, error de validación |
| `POST` con código repetido | `409 CODIGO_DUPLICADO` |
| `POST` con nombre repetido en la misma categoría | `409 POSIBLE_DUPLICADO` |
| Mismo POST con `confirmarDuplicado: true` | `201` |
| `GET /api/productos?porPagina=1&pagina=2` | `200`, página correcta |
| `PATCH /api/productos/:id/estado` | `200`, estado actualizado |
| `POST /api/respaldos` | `201`, archivo real |
| `GET /api/respaldos` | `200`, lista con tamaño y fecha |
| `GET /api/respaldos/:archivo/descargar` | Descarga real del `.dump` |
| PostgreSQL apagado / puerto incorrecto | `/api/salud` y `/api/productos` devuelven `503 BASE_DATOS_NO_DISPONIBLE` |

### Prueba de conexión fallida

Se inició el backend en el puerto 4001 con `DB_PORT=5999` (puerto sin servicio). Resultado:

```json
{
  "error": {
    "codigo": "BASE_DATOS_NO_DISPONIBLE",
    "mensaje": "No se pudo conectar con PostgreSQL. Verifique que el servicio esté iniciado y que las variables DB_* de .env sean correctas."
  }
}
```

Tanto `/api/salud` como `/api/productos` respondieron `503` con un mensaje comprensible. No se expuso la contraseña ni el stack.

---

## 4. Verificación de la interfaz en navegador

Se usó el navegador integrado con la aplicación servida por Express en `http://localhost:4000`.

| Pantalla / flujo | Verificación | Resultado |
|---|---|---|
| Inicio | Carga, resumen (8 productos, 12 categorías, 3 fraccionados, 8 activos), últimos productos | ✅ |
| Buscar | `?q=tubo` devuelve 1 coincidencia y muestra “Mostrando 1–1 de 1” | ✅ |
| Catálogo | 8 productos, filtros, orden, paginación, etiqueta “Fraccionado” | ✅ |
| Detalle | Producto `[DEMO] Arena fina`, unidad de referencia, 2 unidades adicionales, equivalencias pendientes | ✅ |
| Registrar | Formulario completo, creación inline de categoría/unidad, unidades adicionales | ✅ |
| Alta real | Producto “Producto de prueba UI” creado con ID 9 | ✅ |
| Duplicado | Mismo nombre + categoría abre diálogo “Posible producto duplicado” | ✅ |
| Confirmación | “Registrar de todos modos” crea el producto con ID 10 | ✅ |
| Estado | Desactivar y reactivar `[DEMO] Tornillo autorroscante` sin borrarlo | ✅ |
| Respaldos | Lista el `.dump` existente, permite generar y descargar | ✅ |
| 404 | `/ruta-inexistente` muestra “Esta página no existe” y enlaces | ✅ |
| Responsive | Render en iframe de 390 × 844 px: menú hamburguesa, búsqueda apilada, tarjetas en una columna | ✅ |
| Consola | Sin errores después de la corrección de CORS | ✅ |

Los productos temporales de la prueba de interfaz (IDs 9 y 10) se eliminaron después. La base quedó con los 8 productos `[DEMO]`.

### Prueba de persistencia

1. Se creó `Persistencia temporal` (código `PERSIST-TEMP`) por API.
2. Se detuvo el proceso del backend.
3. Se inició de nuevo.
4. La búsqueda `PERSIST-TEMP` devolvió 1 resultado con el mismo ID.
5. Se eliminó el producto temporal.

Esto confirma que los datos viven en PostgreSQL y no en memoria.

---

## 5. Verificación de respaldo y restauración

| Paso | Resultado |
|---|---|
| Generar respaldo desde la API | `201`, archivo `ferreteria_20261027_164307.dump` |
| Tamaño | 17.858 bytes, mayor que cero |
| `pg_restore --list` | Lista tablas, índices, constraints y trigger; archivo válido |
| Restaurar en `ferreteria_restauracion` | Completado sin errores |
| Conteos tras restaurar | 8 productos, 12 categorías, 27 unidades (coinciden con el origen) |
| Descarga desde la interfaz | Archivo descargado correctamente |

> La base `ferreteria_restauracion` conserva datos de prueba. Puede eliminarse cuando ya no se necesite.

---

## 6. Compilación del frontend

```powershell
npm.cmd run build
```

Resultado:

```text
vite v8.3.5 building client environment for production...
✓ 46 modules transformed.
dist/index.html                   0.66 kB │ gzip:  0.39 kB
dist/assets/index-0cVdhpH4.css   32.52 kB │ gzip:  7.11 kB
dist/assets/index-CkpzFTZW.js   325.07 kB │ gzip: 97.99 kB
✓ built in 290ms
```

Sin advertencias de compilación.

---

## 7. Defectos encontrados y corregidos durante la verificación

### 7.1 Los archivos CSS y JS devolvían 403 / JSON

**Síntoma:** la página cargaba el HTML pero sin estilos ni JavaScript. La consola mostraba:

```text
Refused to apply style ... MIME type ('application/json')
Failed to load resource: 403 (Forbidden)
```

**Causa:** Vite agrega `crossorigin` a los archivos compilados. El navegador enviaba `Origin: http://localhost:4000` incluso en solicitudes del mismo origen. CORS solo permitía `http://localhost:5173`, así que rechazaba los assets.

**Corrección:** `backend/src/config/env.js` agrega automáticamente `http://localhost:${PORT}` y `http://127.0.0.1:${PORT}` a `origenesPermitidos`.

**Verificación:** recarga sin errores de consola; CSS y JS responden `200`.

### 7.2 Búsqueda de códigos con minúsculas

**Síntoma:** la búsqueda de códigos era sensible a mayúsculas en algunos casos.

**Corrección:** la consulta usa `ILIKE` sobre `codigo_normalizado` y `LIKE` sobre `nombre_normalizado`.

**Verificación:** `DEMO-004`, `demo-004` y variantes con tildes encuentran el producto.

### 7.3 Comando de restauración con puerto fijo

**Síntoma:** la pantalla de respaldos mostraba `-p 5432`, aunque el clúster local usa 5433.

**Corrección:** se muestra `<puerto>` y una nota que indica 5432 o 5433 según `.env`.

---

## 8. Prueba de carga con 3.000 productos

Se insertaron **3.000 productos sintéticos** en `ferreteria_test` con nombres y códigos únicos (`CARGA-0001` a `CARGA-3000`), categoría “Ferretería general” y unidad “Unidad”. Se levantó un backend temporal en el puerto 4002 apuntando a `ferreteria_test` y se midieron las consultas.

| Caso | Tiempo | Resultado |
|---|---|---|
| Búsqueda exacta por código `CARGA-0500` | 190 ms (primera consulta, en frío) | 1 coincidencia |
| Búsqueda amplia `producto de carga` | 27 ms | 3.000 coincidencias, página 1/150, 20 filas |
| Paginación profunda `porPagina=100&pagina=30` | 24 ms | 100 filas, página 30/30 |
| Filtro categoría + estado | 18 ms | 3.000 coincidencias, 20 filas |

`EXPLAIN ANALYZE` de la búsqueda amplia:

```text
Limit  ... actual time=1.837..1.840 rows=20
  -> Sort ... top-N heapsort
       -> Seq Scan on productos ... actual time=0.041..1.217 rows=3000
Execution Time: 1.870 ms
```

Con 3.000 filas el planificador prefiere un recorrido secuencial porque la tabla ocupa pocas páginas; los índices GIN de trigramas están disponibles para cuando el catálogo crezca. El tiempo total de la API (incluyendo JSON y red local) se mantuvo por debajo de 30 ms en las consultas en caliente.

**Limpieza:** se detuvo el backend temporal y se truncaron los productos de `ferreteria_test`. La base principal `ferreteria` no se tocó.

---

## 9. Pruebas no automatizadas / pendientes

| Área | Estado | Recomendación |
|---|---|---|
| Pruebas de interfaz (Playwright/Cypress) | No incluidas | Agregar si se requiere regresión visual |
| Carga con 3.000+ productos | **Ejecutada** (ver sección 8) | Repetir con datos reales y más volumen |
| Concurrencia de escritura | No probada | Probar dos altas simultáneas con el mismo código |
| Accesibilidad automatizada | No ejecutada con axe/Lighthouse | Ejecutar Lighthouse en la pantalla de registro |
| Restauración sobre la base en uso | Solo documentada y probada en base aparte | Probar en un equipo de prueba con respaldo previo |
| Navegadores distintos de Chromium | No probados | Verificar Edge/Firefox si se usan |
| Autenticación y HTTPS | Fuera de alcance | Agregar antes de exponer en red |

---

## 10. Cómo reproducir la verificación

```powershell
# 1. Base y dependencias
npm.cmd run db:local:iniciar
npm.cmd run db:esquema
npm.cmd run instalar

# 2. Pruebas
npm.cmd test

# 3. Compilación
npm.cmd run build

# 4. Arranque
npm.cmd start
```

Luego abra <http://localhost:4000> y siga la tabla de la sección 4.

---

## 11. Conclusión

- La API pasa **13/13** pruebas de integración contra PostgreSQL real.
- La interfaz funciona en escritorio y en ancho móvil.
- La búsqueda, los duplicados, el estado y los respaldos fueron verificados manualmente.
- La búsqueda y la paginación se probaron con **3.000 productos sintéticos** en `ferreteria_test`; las consultas en caliente respondieron en menos de 30 ms.
- Se generó, verificó y restauró un respaldo real.
- No quedan errores bloqueantes conocidos.
- Las limitaciones y preguntas de negocio están documentadas en [PREGUNTAS_PENDIENTES.md](PREGUNTAS_PENDIENTES.md) y en el README.
