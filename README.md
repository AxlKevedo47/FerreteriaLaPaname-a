# Ferretería La Panameña — Catálogo local de productos

Aplicación web local para **registrar, organizar, buscar y consultar** los productos de la ferretería. Está pensada para ejecutarse en un equipo Windows de la ferretería, sin depender de internet ni de servicios externos.

- **Frontend:** React 19 + React Router 7 + Vite 8.
- **Backend:** Node.js 22+ con Express 5.
- **Base de datos:** PostgreSQL 14 o superior (verificada con PostgreSQL 18.6).
- **Interfaz:** blanca con verde aqua, responsiva y con mensajes en español.

> **Alcance deliberado:** este sistema es un catálogo. No registra ventas, facturación, existencias, movimientos de inventario, proveedores, precios ni costos. Tampoco incluye usuarios, contraseñas, roles ni autenticación. Esas funciones no forman parte del pedido y no se simulan con datos inventados.

---

## 1. Qué incluye

| Función | Estado |
|---|---|
| Registrar productos con nombre, código opcional, categoría, unidad de referencia y descripción | ✅ |
| Crear categorías y unidades desde el formulario de registro | ✅ |
| Marcar productos fraccionados y agregar unidades adicionales de venta | ✅ |
| Guardar equivalencias solo cuando el negocio las haya confirmado | ✅ |
| Detectar códigos duplicados (sin distinguir mayúsculas ni tildes) | ✅ |
| Advertir posibles duplicados por nombre + categoría y permitir confirmarlos | ✅ |
| Buscar por nombre o código sin distinguir mayúsculas, minúsculas ni tildes | ✅ |
| Filtrar por categoría, estado y tipo (fraccionado / no fraccionado) | ✅ |
| Ordenar y paginar resultados (20 por página, máximo 100) | ✅ |
| Ver el detalle de un producto y sus unidades | ✅ |
| Activar / desactivar productos sin borrarlos | ✅ |
| Generar respaldos reales con `pg_dump`, listarlos y descargarlos | ✅ |
| Restauración manual y con confirmación (fuera de la interfaz) | ✅ |
| Datos de demostración claramente marcados `[DEMO]` | ✅ opcional |

---

## 2. Requisitos

- Windows 10 u 11.
- **Node.js 22.12 o superior** y npm.
- **PostgreSQL 14 o superior** instalado. El proyecto fue verificado con PostgreSQL 18.6.
- PowerShell 5.1 o superior.
- Espacio en disco para la base, los respaldos y `node_modules`.

Compruebe las versiones en PowerShell:

```powershell
node --version
npm --version
psql --version
```

> Si PowerShell bloquea `npm.ps1` con un error de directiva de ejecución, use `npm.cmd` en lugar de `npm`, o ejecute una vez:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

---

## 3. Inicio rápido (clúster local incluido)

Los scripts del proyecto pueden crear un clúster PostgreSQL independiente dentro de `.local/pgdata`, en el puerto **5433**. Esto evita tocar el servicio PostgreSQL que ya exista en el equipo. Es la ruta recomendada para probar el sistema sin credenciales desconocidas.

### Paso 1 — Configurar variables de entorno

```powershell
Copy-Item .env.example .env
notepad .env
```

Cambie como mínimo:

```dotenv
DB_PASSWORD=una_contrasena_larga_y_propia
```

Si usará el clúster local, deje `DB_PORT=5433`. Si usará el servicio PostgreSQL habitual, cambie a `DB_PORT=5432` y use las credenciales de ese servicio.

### Paso 2 — Instalar dependencias

```powershell
npm.cmd run instalar
```

### Paso 3 — Iniciar y preparar PostgreSQL local

```powershell
npm.cmd run db:local:iniciar
```

Este comando:

1. Inicializa el clúster en `.local/pgdata` si no existe.
2. Lo inicia en `127.0.0.1:5433`.
3. Crea el rol `ferreteria_app` con la contraseña de `.env`.
4. Crea las bases `ferreteria` y `ferreteria_test`.

La contraseña del superusuario local se guarda en `.local/postgres-password.txt` y **no** se versiona.

### Paso 4 — Aplicar esquema y catálogos

```powershell
npm.cmd run db:esquema
```

Esto crea las tablas, restricciones, índices y carga las 12 categorías y 27 unidades iniciales. No carga productos reales.

Para cargar también los productos de demostración `[DEMO]`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aplicar-esquema.ps1 -Demo
```

> Los datos `[DEMO]` sirven para probar la interfaz. **No son información real de la ferretería** y deben eliminarse antes de usar el sistema con datos definitivos.

### Paso 5 — Compilar el frontend

```powershell
npm.cmd run build
```

### Paso 6 — Iniciar la aplicación

```powershell
npm.cmd start
```

Abra **http://localhost:4000**.

Compruebe la conexión en **http://localhost:4000/api/salud**. Debe responder:

```json
{
  "estado": "ok",
  "baseDatos": "conectada",
  "servicio": "ferreteria-api"
}
```

---

## 4. Modo desarrollo

Use dos terminales.

**Terminal 1 — backend:**

```powershell
npm.cmd run dev:backend
```

**Terminal 2 — frontend:**

```powershell
npm.cmd run dev:frontend
```

Abra **http://localhost:5173**. Vite reenvía `/api` a `http://localhost:4000`.

En desarrollo el backend registra cada solicitud en la consola. En uso normal puede dejar `NODE_ENV=development`; si prefiere menos ruido, use `NODE_ENV=production` al iniciar.

---

## 5. Uso diario

| Pantalla | Ruta | Para qué sirve |
|---|---|---|
| Inicio | `/` | Resumen del catálogo y últimos productos |
| Buscar | `/buscar` | Búsqueda por nombre o código |
| Catálogo | `/catalogo` | Filtros, orden y paginación |
| Detalle | `/productos/:id` | Información completa y cambio de estado |
| Registrar | `/registrar` | Alta de productos, categorías y unidades |
| Respaldos | `/respaldos` | Generar, listar y descargar respaldos |
| 404 | cualquier ruta desconocida | Mensaje y enlaces de regreso |

### Reglas de duplicados

- **Código:** si se escribe un código, se normaliza (mayúsculas, sin tildes) y debe ser único. Si ya existe, la API responde `409 CODIGO_DUPLICADO`.
- **Nombre:** no es único. Si coincide exactamente (sin tildes ni mayúsculas) con otro producto **de la misma categoría**, la API responde `409 POSIBLE_DUPLICADO` con una lista de coincidencias. El usuario puede revisar y confirmar con `confirmarDuplicado: true`.
- **Productos parecidos pero legítimos** (por ejemplo “Tornillo 1/2” y “Tornillo 3/4”) no se bloquean.

### Productos fraccionados

Un producto fraccionado tiene una **unidad de referencia** (por ejemplo metro cúbico) y puede tener **unidades adicionales de venta** (cubeta, carretillada). La equivalencia es opcional y solo se guarda cuando el negocio la confirma:

- `equivalencia = 2` significa **1 unidad adicional = 2 unidades de referencia**.
- Si no se conoce, se deja vacía y la interfaz muestra “Equivalencia pendiente de confirmar”.
- El sistema **no inventa** conversiones entre cubetas, carretilladas y metros cúbicos.

---

## 6. Variables de entorno

| Variable | Obligatoria | Ejemplo | Descripción |
|---|---|---|---|
| `PORT` | No | `4000` | Puerto del backend |
| `NODE_ENV` | No | `development` | `development`, `test` o `production` |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173,...` | Orígenes adicionales permitidos por CORS |
| `DB_HOST` | Sí | `127.0.0.1` | Host de PostgreSQL |
| `DB_PORT` | Sí | `5433` | Puerto de PostgreSQL |
| `DB_NAME` | Sí | `ferreteria` | Base de datos |
| `DB_USER` | Sí | `ferreteria_app` | Usuario de la aplicación |
| `DB_PASSWORD` | Sí | — | Contraseña; nunca se versiona |
| `PG_DUMP_PATH` | Recomendada | `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` | Ejecutable de respaldo |
| `PG_RESTORE_PATH` | Recomendada | `...\pg_restore.exe` | Ejecutable de restauración |
| `RESPALDO_DIR` | No | `backups` | Carpeta de respaldos |
| `BODY_LIMIT` | No | `100kb` | Tamaño máximo del JSON |

El archivo `.env` está excluido por `.gitignore`. **Nunca lo suba a Git ni lo comparta.**

---

## 7. API REST

Base: `http://localhost:4000/api`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/salud` | Estado del servicio y de PostgreSQL |
| `GET` | `/resumen` | Totales del catálogo |
| `GET` | `/productos` | Lista, búsqueda, filtros y paginación |
| `POST` | `/productos` | Registra un producto |
| `GET` | `/productos/:id` | Detalle con unidades |
| `PATCH` | `/productos/:id/estado` | Activa o desactiva |
| `GET` | `/categorias` | Lista categorías |
| `POST` | `/categorias` | Crea una categoría |
| `GET` | `/unidades` | Lista unidades |
| `POST` | `/unidades` | Crea una unidad |
| `GET` | `/respaldos` | Lista respaldos disponibles |
| `POST` | `/respaldos` | Genera un respaldo real |
| `GET` | `/respaldos/:archivo/descargar` | Descarga un respaldo |

Parámetros de `GET /productos`:

- `busqueda`: texto libre (máximo 100 caracteres).
- `categoria`: ID de categoría.
- `estado`: `activo`, `inactivo` o `todos` (por defecto `todos`).
- `fraccionado`: `true` o `false`.
- `orden`: `nombre_asc`, `nombre_desc`, `codigo_asc`, `reciente`.
- `pagina`: entero positivo (por defecto 1).
- `porPagina`: 1–100 (por defecto 20).

La referencia completa de solicitudes, respuestas y códigos de error está en **[docs/API.md](docs/API.md)**.

---

## 8. Respaldos y restauración

### Desde la interfaz

1. Abra **Respaldos**.
2. Pulse **Generar respaldo**.
3. Descargue el archivo `.dump` y guárdelo en otro medio.

El respaldo es real: el backend ejecuta `pg_dump` en formato *custom*, comprueba que el archivo exista y no esté vacío, y solo entonces lo muestra. No se simula la descarga.

### Desde la terminal

```powershell
npm.cmd run respaldo
```

### Restauración

La restauración **no se ejecuta desde la interfaz**, para evitar sobrescrituras accidentales. Se hace con confirmación explícita y, preferiblemente, sobre una base de prueba:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restaurar.ps1 `
  -Archivo backups\ferreteria_20261027_162901.dump `
  -BaseDestino ferreteria_restauracion
```

El procedimiento completo, incluida la verificación con `pg_restore --list` y la restauración en una base aparte, está en **[docs/RESPALDO_Y_RESTAURACION.md](docs/RESPALDO_Y_RESTAURACION.md)**.

> Un respaldo que nunca se ha restaurado no está verificado. Este proyecto incluye la prueba de restauración en `ferreteria_restauracion`; repítala periódicamente.

---

## 9. Pruebas

Con `ferreteria_test` preparada (esquema + catálogos):

```powershell
npm.cmd test
```

Son 13 pruebas de integración contra PostgreSQL real. Cubren salud, validaciones, alta, detalle, duplicados, búsqueda con tildes, paginación, filtros, estado, 404 y generación de respaldo.

También se ejecutó una prueba de carga con **3.000 productos sintéticos** en `ferreteria_test`: las búsquedas y la paginación respondieron en menos de 30 ms en caliente.

Resultados y verificación manual en **[docs/PRUEBAS.md](docs/PRUEBAS.md)**.

Para preparar la base de pruebas:

```powershell
$env:PGPASSWORD = "su_contrasena"
psql -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria_test -f database/schema.sql
psql -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria_test -f database/seed-catalogos.sql
Remove-Item Env:PGPASSWORD
```

---

## 10. Estructura del proyecto

```text
Ferreteria/
├─ backend/
│  ├─ src/
│  │  ├─ config/          # Lectura de .env y pool de PostgreSQL
│  │  ├─ controllers/     # Respuestas HTTP
│  │  ├─ errors/          # ErrorAplicacion y errores de dominio
│  │  ├─ middleware/      # asyncHandler y manejador central de errores
│  │  ├─ repositories/    # SQL parametrizado
│  │  ├─ routes/          # Rutas REST
│  │  ├─ services/        # Reglas de negocio
│  │  ├─ utils/           # Normalización y paginación
│  │  ├─ validators/      # Validación de entrada
│  │  ├─ app.js           # Express, CORS, Helmet, estáticos
│  │  └─ server.js        # Arranque y cierre ordenado
│  └─ tests/api.test.js   # Pruebas de integración
├─ frontend/
│  ├─ src/
│  │  ├─ api/             # Cliente fetch
│  │  ├─ components/      # Componentes reutilizables
│  │  ├─ context/         # Avisos (toasts)
│  │  ├─ hooks/           # Título de página
│  │  ├─ pages/           # Inicio, buscar, catálogo, detalle, registrar, respaldos
│  │  ├─ styles/          # CSS propio, responsivo
│  │  └─ utils/           # Formatos
│  └─ vite.config.js
├─ database/
│  ├─ schema.sql          # Tablas, restricciones, índices, trigger
│  ├─ seed-catalogos.sql  # 12 categorías y 27 unidades
│  └─ seed-demo.sql       # Productos [DEMO] opcionales
├─ docs/                  # Arquitectura, base de datos, instalación, pruebas...
├─ scripts/               # PostgreSQL local, esquema, respaldo y restauración
├─ backups/               # Respaldos (excluido de Git)
├─ .env.example
├─ package.json
└─ README.md
```

---

## 11. Documentación

- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — capas, flujo de una solicitud y decisiones técnicas.
- **[docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md)** — tablas, restricciones, índices y reglas de duplicados.
- **[docs/INSTALACION_WINDOWS.md](docs/INSTALACION_WINDOWS.md)** — instalación paso a paso y solución de problemas.
- **[docs/RESPALDO_Y_RESTAURACION.md](docs/RESPALDO_Y_RESTAURACION.md)** — respaldo, verificación y restauración segura.
- **[docs/PRUEBAS.md](docs/PRUEBAS.md)** — pruebas automatizadas y verificación manual.
- **[docs/API.md](docs/API.md)** — referencia de la API.
- **[docs/PREGUNTAS_PENDIENTES.md](docs/PREGUNTAS_PENDIENTES.md)** — decisiones que debe confirmar la ferretería.
- **[docs/BITACORA.md](docs/BITACORA.md)** — registro del desarrollo y de los problemas corregidos.

---

## 12. Preguntas pendientes para la ferretería

Antes de cargar datos definitivos, confirme:

1. ¿El **código** debe ser obligatorio? Hoy es opcional.
2. ¿La **descripción** debe ser obligatoria? Hoy es opcional.
3. ¿Las **categorías y unidades** iniciales son las correctas? ¿Falta alguna?
4. ¿Los criterios de **duplicado** son suficientes? Hoy se advierte por nombre exacto + categoría.
5. ¿Qué **equivalencias** existen entre cubeta, carretillada, saco y metro cúbico?
6. ¿Qué significa **inactivo**? ¿Debe ocultarse de la búsqueda o solo marcarse?
7. ¿Se necesita **editar** un producto después de registrarlo?
8. ¿Se necesita **eliminar** productos o basta con desactivarlos?
9. ¿Se requiere **importar/exportar CSV**?
10. ¿Cada cuánto se hará el **respaldo** y dónde se guardará la copia externa?

Detalle y justificación en **[docs/PREGUNTAS_PENDIENTES.md](docs/PREGUNTAS_PENDIENTES.md)**.

---

## 13. Limitaciones conocidas

- **Sin autenticación:** cualquier persona con acceso al equipo y al puerto 4000 puede consultar o modificar. Es un sistema local de un solo equipo; no lo exponga a internet.
- **Sin edición completa:** se puede registrar, consultar, buscar y cambiar el estado, pero no modificar nombre, categoría o unidades desde la interfaz. Si se equivoca, hoy debe corregirse en la base o esperar una función de edición.
- **Sin borrado:** no hay endpoint de eliminación; se usa `activo`/`inactivo`. El borrado directo en SQL debe hacerse con respaldo previo.
- **Sin ventas, precios, costos, existencias, proveedores ni movimientos:** fuera del alcance solicitado.
- **Sin imágenes de producto, importación CSV, auditoría ni historial de cambios.**
- **Sin HTTPS:** pensado para `localhost`. Si se publica en una red, use un proxy con TLS y autenticación.
- **CORS restringido:** por defecto solo se admiten `localhost`/`127.0.0.1` en el puerto de la API y el frontend de desarrollo en 5173. Para acceder desde otro equipo, agregue su origen a `FRONTEND_ORIGIN` y revise la configuración de red.
- **Sin migraciones automáticas:** `schema.sql` es idempotente para instalaciones nuevas, pero los cambios futuros deben planificarse y respaldarse antes.
- **Respaldos manuales:** no hay programación automática. Se recomienda crear una tarea de Windows o ejecutar `npm.cmd run respaldo` con regularidad.
- **Datos `[DEMO]`:** si se cargaron, deben eliminarse antes de operar con datos reales.

---

## 14. Bitácora en el código

Las decisiones importantes están comentadas con el prefijo `BITÁCORA` en los archivos principales, por ejemplo:

- `backend/src/config/env.js` — configuración centralizada y orígenes propios.
- `backend/src/config/db.js` — uso de `pg` sin ORM.
- `backend/src/repositories/productos.repository.js` — SQL parametrizado y búsqueda.
- `backend/src/services/productos.service.js` — duplicados.
- `backend/src/services/respaldos.service.js` — respaldo real.
- `frontend/vite.config.js` — proxy de desarrollo.
- `frontend/src/styles/global.css` — paleta y responsividad.

El historial completo está en **[docs/BITACORA.md](docs/BITACORA.md)**.

---

## 15. Detener y reiniciar

Detener PostgreSQL local:

```powershell
npm.cmd run db:local:detener
```

Ver estado:

```powershell
npm.cmd run db:local:estado
```

Detener la aplicación: `Ctrl+C` en la terminal donde corre `npm.cmd start`.

Volver a iniciar:

```powershell
npm.cmd run db:local:iniciar
npm.cmd start
```

---

## 16. Licencia y uso

Proyecto privado para Ferretería La Panameña. No se distribuye con una licencia pública. Los datos, credenciales y respaldos son responsabilidad del propietario del equipo.
