# Arquitectura

## 1. Objetivo y restricciones

El sistema es un **catálogo local de productos** para una sola ferretería. Debe funcionar en un equipo Windows, sin internet, con una base PostgreSQL y una interfaz web moderna.

Restricciones que guiaron el diseño:

- Sin autenticación, usuarios ni roles.
- Sin ventas, facturación, existencias, movimientos, proveedores, precios ni costos.
- Sin datos comerciales inventados.
- Sin dependencias innecesarias: no hay ORM, no hay librería de componentes, no hay framework CSS.
- La búsqueda debe funcionar con **3.000 o más productos** y ser insensible a mayúsculas y tildes.
- Los respaldos deben ser reales y verificables.

## 2. Vista general

```text
┌─────────────────────────────────────────────────────────────┐
│ Navegador (React 19 + React Router 7)                       │
│  Inicio · Buscar · Catálogo · Detalle · Registrar · Respaldos│
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Express 5 (Node.js 22+)                                     │
│  Helmet · CORS · JSON · Rutas /api · Estáticos de dist/     │
│                                                             │
│  routes → controllers → services → repositories → pg Pool   │
│                  │            │                             │
│                  │            └─ SQL parametrizado          │
│                  └─ validación y reglas de negocio          │
└───────────────────────────┬─────────────────────────────────┘
                            │ TCP 5432/5433
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL 18                                               │
│  categorias · unidades_medida · productos · producto_unidades│
│  Restricciones, índices GIN (pg_trgm), trigger de fecha      │
└─────────────────────────────────────────────────────────────┘
```

En desarrollo, Vite atiende el frontend en `http://localhost:5173` y reenvía `/api` al backend en `http://localhost:4000`. En uso normal, Express sirve `frontend/dist` y la API desde el mismo origen, en `http://localhost:4000`.

## 3. Separación de carpetas

```text
backend/     API, reglas de negocio, acceso a datos
frontend/    interfaz React y estilos
database/    esquema y datos iniciales
docs/        documentación
scripts/     automatización de Windows/PowerShell
```

Cada carpeta tiene su propio `package.json` cuando corresponde. La raíz solo orquesta comandos.

## 4. Capas del backend

### 4.1 `config/`

- `env.js`: lee `.env` una sola vez, valida variables obligatorias y resuelve rutas. También calcula los orígenes CORS permitidos.
- `db.js`: crea un `Pool` de `pg` con máximo 10 conexiones, tiempos de espera y `application_name`. No hay ORM.

### 4.2 `routes/`

Declaran los verbos y rutas. No contienen lógica de negocio. Usan `asyncHandler` para que cualquier promesa rechazada llegue al manejador central.

### 4.3 `controllers/`

Traducen la solicitud HTTP a una llamada de servicio y arman la respuesta JSON. No acceden a la base directamente.

### 4.4 `services/`

Contienen las reglas:

- Validar y normalizar la entrada.
- Comprobar que categoría y unidades existan.
- Detectar códigos duplicados.
- Advertir posibles duplicados por nombre + categoría.
- Insertar producto y unidades en una transacción.
- Cambiar estado.
- Generar respaldos.

### 4.5 `repositories/`

Todo el SQL vive aquí. Las consultas usan parámetros `$1`, `$2`, etc. El orden de resultados se elige desde una **lista blanca** (`ORDENES`), nunca desde texto libre del usuario.

### 4.6 `validators/`

Validan tipos, longitudes y formatos antes de tocar la base. Devuelven un objeto `{ valido, errores, datos }` con mensajes en español.

### 4.7 `middleware/`

- `asyncHandler`: envuelve controladores asíncronos.
- `errorHandler`: traduce errores de aplicación, JSON inválido, códigos PostgreSQL (`23505`, `23503`, `23514`, `22P02`) y errores de conexión a respuestas claras, sin exponer stack ni contraseña.

## 5. Flujo de una solicitud

Ejemplo: `POST /api/productos`

```text
1. Express recibe JSON (límite BODY_LIMIT).
2. helmet agrega encabezados de seguridad; cors valida el origen.
3. La ruta llama al controlador.
4. El controlador llama a registrarProducto(cuerpo).
5. El validador comprueba nombre, código, categoría, unidad y unidades adicionales.
6. El servicio verifica que categoría y unidades existan.
7. Se normaliza el código y se busca un duplicado exacto.
8. Se normaliza el nombre y se buscan coincidencias en la misma categoría.
   - Si hay coincidencias y no se confirmó: 409 POSIBLE_DUPLICADO.
9. El repositorio abre una transacción, inserta el producto y sus unidades, y hace COMMIT.
10. El controlador responde 201 con el producto completo.
11. Cualquier error salta al manejador central y se devuelve con código y mensaje.
```

## 6. Modelo de datos resumido

```text
categorias 1 ──── N productos N ──── 1 unidades_medida
                        │
                        └── N producto_unidades N ─── 1 unidades_medida
```

- `productos.unidad_referencia_id` es la unidad base.
- `producto_unidades` guarda las demás formas de venta.
- `producto_unidades.equivalencia` es nullable: `NULL` significa “pendiente de confirmar”.
- No se almacenan conversiones inventadas.

Detalle completo en [BASE_DE_DATOS.md](BASE_DE_DATOS.md).

## 7. Búsqueda y normalización

Al guardar y al consultar se aplica la misma normalización:

1. Descomponer Unicode (`NFD`).
2. Quitar marcas diacríticas (`\u0300`–`\u036f`).
3. Convertir a minúsculas.
4. Colapsar espacios.
5. Recortar extremos.

Así, `Tubería`, `tuberia`, `TUBERÍA` y `Tuberia` producen la misma clave. El código se normaliza además a mayúsculas.

La búsqueda usa:

```sql
(p.nombre_normalizado LIKE '%' || $1 || '%'
 OR COALESCE(p.codigo_normalizado, '') ILIKE '%' || $1 || '%')
```

Los índices GIN con `pg_trgm` aceleran los comodines. Para 3.000–10.000 productos el rendimiento es adecuado. Si el catálogo creciera a cientos de miles, convendría evaluar búsqueda de texto completo o un motor dedicado.

## 8. Duplicados

### Código

- Se normaliza a mayúsculas y sin tildes.
- Índice único parcial `productos_codigo_unico` (solo cuando no es `NULL`).
- La API comprueba antes de insertar y también captura la violación `23505` como red de seguridad.

### Nombre

- **No** es único a nivel de base de datos.
- Se advierte solo si coincide exactamente (normalizado) **y** pertenece a la misma categoría.
- El usuario puede confirmar con `confirmarDuplicado: true`.
- Esto evita bloquear productos legítimamente parecidos.

## 9. Frontend

- **React 19** con componentes funcionales y hooks.
- **React Router 7** para las rutas.
- **Vite 8** para desarrollo y compilación.
- **CSS propio** en `frontend/src/styles/global.css`, con variables de color, diseño responsivo y foco visible.
- **Iconos SVG inline** en `Icono.jsx`; no hay librería de iconos.
- **Sin librería de componentes**: botones, campos, alertas, tablas, paginación y diálogos son propios.
- **Toasts** mediante `ToastContext`.
- **Diálogo de confirmación** reutilizable para duplicados y cambios de estado.
- **Formulario de registro** con creación inline de categorías y unidades, selección de unidades adicionales y equivalencias opcionales.

### Estado

No se usa Redux ni Zustand. Cada página maneja su estado con `useState`/`useEffect` y llama a la API mediante `src/api/client.js`. Es suficiente para el tamaño del catálogo y evita dependencias.

### Accesibilidad

- Enlace “Saltar al contenido”.
- Etiquetas asociadas a los campos.
- Mensajes de error con `aria-invalid` y texto descriptivo.
- Diálogos con `role="dialog"`, `aria-modal` y cierre con Escape.
- Foco visible y navegación por teclado.
- Contraste alto sobre fondo blanco/aqua.
- Tablas con encabezados y texto alternativo en iconos.

## 10. Seguridad

- **Helmet** con CSP, `frame-ancestors`, `object-src 'none'`, etc.
- **CORS** limitado a orígenes configurados y al propio origen del puerto de la API.
- **Consultas parametrizadas** en todo el SQL.
- **Lista blanca** para ordenamientos.
- **Validación doble**: frontend y backend; el backend siempre vuelve a validar.
- **Límite de cuerpo** JSON.
- **Errores sin stack** ni credenciales.
- **Sin autenticación**: es una decisión de alcance, no un olvido. No exponga la aplicación a internet.

### Corrección importante: CORS y archivos estáticos

Vite agrega el atributo `crossorigin` a los archivos compilados. Eso hace que el navegador envíe `Origin` incluso al pedir CSS y JS del mismo servidor. Si el origen propio no estaba en la lista, los archivos recibían `403` y la página quedaba sin estilos ni JavaScript.

La solución implementada en `backend/src/config/env.js` agrega automáticamente `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}` y `http://[::1]:${PORT}` a los orígenes permitidos. Así el frontend compilado funciona sin abrir CORS a cualquier origen.

## 11. Respaldos

El servicio de respaldos:

1. Crea la carpeta si no existe.
2. Genera un nombre `ferreteria_AAAAMMDD_HHMMSS.dump` (con sufijo si hay colisión).
3. Ejecuta `pg_dump` en formato *custom*, compresión 6, sin propietario ni privilegios.
4. Comprueba que el archivo exista y tenga tamaño mayor que cero.
5. Si falla, elimina el archivo parcial.
6. Devuelve nombre, tamaño, fecha y URL de descarga.

La restauración **no** está en la API ni en la interfaz. Se hace con `scripts/restaurar.ps1`, que exige confirmación y permite elegir una base de destino distinta de la base en uso.

## 12. Decisiones y ventajas

| Decisión | Ventaja | Costo |
|---|---|---|
| Sin ORM | SQL transparente, menos dependencias, control de índices | Más código manual |
| CSS propio | Control total del diseño y del peso | Más mantenimiento visual |
| Sin autenticación | Simplicidad para un equipo local | No apto para red pública |
| Soft delete por estado | No se pierde información | No libera el código de producto |
| Edición con PUT completo | Validación y formulario únicos; actualización atómica de unidades | El cliente debe enviar todos los campos editables |
| Duplicado suave por nombre | No bloquea productos parecidos | Requiere confirmación del usuario |
| Respaldo fuera de la UI para restaurar | Evita sobrescrituras accidentales | Requiere terminal |

## 13. Evolución sugerida

Sin cambiar la arquitectura:

1. Evaluar un historial de cambios si la operación futura requiere trazabilidad; la edición actual usa `PUT /api/productos/:id` sin auditoría histórica.
2. Agregar importación/exportación CSV.
3. Agregar autenticación básica y HTTPS si se publica en red.
4. Programar respaldos con el Programador de tareas de Windows.
5. Agregar pruebas de interfaz con Playwright.
6. Agregar un historial de cambios si el negocio lo requiere.

Cualquier evolución debe respetar el alcance: no inventar precios, existencias ni conversiones.
