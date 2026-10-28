# API REST

Base local: `http://localhost:4000/api`

No hay autenticación. La API está pensada para `localhost` y no debe exponerse a internet.

Todas las solicitudes y respuestas usan JSON, excepto la descarga de respaldos.

---

## 1. Formato de respuesta

### Éxito

```json
{
  "datos": { },
  "mensaje": "Texto opcional"
}
```

### Error

```json
{
  "error": {
    "codigo": "CODIGO_DE_ERROR",
    "mensaje": "Mensaje comprensible en español",
    "detalles": { }
  }
}
```

`detalles` es opcional. Nunca se devuelve el stack ni la contraseña.

---

## 2. Salud

### `GET /api/salud`

Comprueba el servicio y la conexión a PostgreSQL.

**Respuesta 200:**

```json
{
  "estado": "ok",
  "baseDatos": "conectada",
  "servicio": "ferreteria-api",
  "hora": "2026-10-27T22:31:55.849Z"
}
```

**Respuesta 503:**

```json
{
  "estado": "degradado",
  "baseDatos": "no disponible",
  "mensaje": "No se pudo conectar con PostgreSQL. Verifique que el servicio esté iniciado y que las variables DB_* de .env sean correctas."
}
```

---

## 3. Resumen

### `GET /api/resumen`

**Respuesta 200:**

```json
{
  "datos": {
    "total": 8,
    "activos": 8,
    "inactivos": 0,
    "fraccionados": 3,
    "categorias": 12,
    "unidades": 27
  }
}
```

---

## 4. Productos

### 4.1 `GET /api/productos`

Lista, busca, filtra, ordena y pagina.

#### Parámetros de consulta

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `busqueda` | texto | — | Busca en nombre y código; máximo 100 caracteres |
| `categoria` | entero | — | ID de categoría |
| `estado` | texto | `todos` | `activo`, `inactivo` o `todos` |
| `fraccionado` | booleano | — | `true` o `false` |
| `orden` | texto | `nombre_asc` | `nombre_asc`, `nombre_desc`, `codigo_asc`, `reciente` |
| `pagina` | entero | `1` | Página solicitada |
| `porPagina` | entero | `20` | 1–100 |

#### Ejemplo

```http
GET /api/productos?busqueda=tubo&estado=activo&orden=nombre_asc&pagina=1&porPagina=20
```

**Respuesta 200:**

```json
{
  "datos": [
    {
      "id": 6,
      "codigo": "DEMO-006",
      "nombre": "[DEMO] Tubo PVC 1/2 pulgada",
      "descripcion": "Producto de demostración. No representa existencias ni precios reales.",
      "esFraccionado": false,
      "estado": "activo",
      "creadoEn": "2026-10-27T22:31:00.000Z",
      "actualizadoEn": "2026-10-27T22:31:00.000Z",
      "unidadesAdicionales": 0,
      "categoria": {
        "id": 5,
        "nombre": "Plomería"
      },
      "unidadReferencia": {
        "id": 7,
        "nombre": "Metro",
        "abreviatura": "m"
      }
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 20,
    "total": 1,
    "totalPaginas": 1,
    "tieneAnterior": false,
    "tieneSiguiente": false
  }
}
```

#### Búsqueda

- No distingue mayúsculas, minúsculas ni tildes.
- Busca en `nombre` y `codigo`.
- No busca en `descripcion`.
- Los comodines `%` y `_` se tratan como parte del texto normalizado; no se interpretan como SQL porque el valor va parametrizado.

#### Errores

- `400 DATOS_INVALIDOS` si `busqueda` supera 100 caracteres, `categoria` no es entera, `estado` no es válido, `fraccionado` no es booleano u `orden` no está en la lista.

---

### 4.2 `POST /api/productos`

Registra un producto.

#### Cuerpo

```json
{
  "nombre": "Arena fina",
  "codigo": "AR-001",
  "descripcion": "Arena para construcción.",
  "categoriaId": 4,
  "unidadReferenciaId": 9,
  "esFraccionado": true,
  "unidadesComercializacion": [
    {
      "unidadId": 24,
      "equivalencia": null,
      "notaEquivalencia": "Equivalencia pendiente de confirmar."
    },
    {
      "unidadId": 25,
      "equivalencia": 0.035,
      "notaEquivalencia": null
    }
  ],
  "confirmarDuplicado": false
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `nombre` | Sí | 2–150 caracteres |
| `codigo` | No | Máximo 40; letras, números, espacios, `.`, `_`, `-`, `/`; único |
| `descripcion` | No | Máximo 1000 |
| `categoriaId` | Sí | Entero positivo existente |
| `unidadReferenciaId` | Sí | Entero positivo existente |
| `esFraccionado` | No | Booleano; por defecto `false` |
| `unidadesComercializacion` | No | Lista de hasta 20; no puede repetir la unidad de referencia ni una unidad |
| `unidadesComercializacion[].unidadId` | Sí | Entero positivo existente |
| `unidadesComercializacion[].equivalencia` | No | Número > 0; `null` = pendiente |
| `unidadesComercializacion[].notaEquivalencia` | No | Máximo 200 |
| `confirmarDuplicado` | No | Booleano; por defecto `false` |

**Respuesta 201:**

```json
{
  "datos": {
    "id": 12,
    "codigo": "AR-001",
    "nombre": "Arena fina",
    "descripcion": "Arena para construcción.",
    "esFraccionado": true,
    "estado": "activo",
    "creadoEn": "2026-10-27T22:40:00.000Z",
    "actualizadoEn": "2026-10-27T22:40:00.000Z",
    "unidadesAdicionales": 2,
    "categoria": { "id": 4, "nombre": "Áridos y agregados" },
    "unidadReferencia": { "id": 9, "nombre": "Metro cúbico", "abreviatura": "m³" },
    "unidadesComercializacion": [
      {
        "id": 1,
        "unidadId": 24,
        "nombre": "Cubeta",
        "abreviatura": "cubeta",
        "equivalencia": null,
        "notaEquivalencia": "Equivalencia pendiente de confirmar."
      },
      {
        "id": 2,
        "unidadId": 25,
        "nombre": "Carretillada",
        "abreviatura": "carretilla",
        "equivalencia": 0.035,
        "notaEquivalencia": null
      }
    ]
  },
  "mensaje": "Producto registrado correctamente."
}
```

#### Errores típicos

**400 DATOS_INVALIDOS:**

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Revise los campos señalados.",
    "detalles": {
      "nombre": "El nombre del producto es obligatorio.",
      "categoriaId": "Seleccione una categoría."
    }
  }
}
```

**409 CODIGO_DUPLICADO:**

```json
{
  "error": {
    "codigo": "CODIGO_DUPLICADO",
    "mensaje": "El código \"AR-001\" ya está registrado en otro producto.",
    "detalles": {
      "producto": {
        "id": 12,
        "nombre": "Arena fina",
        "codigo": "AR-001",
        "estado": "activo",
        "categoria": "Áridos y agregados"
      }
    }
  }
}
```

**409 POSIBLE_DUPLICADO:**

```json
{
  "error": {
    "codigo": "POSIBLE_DUPLICADO",
    "mensaje": "Ya existe un producto con el mismo nombre en esta categoría. Revise si es un duplicado.",
    "detalles": {
      "duplicados": [
        {
          "id": 12,
          "nombre": "Arena fina",
          "codigo": "AR-001",
          "estado": "activo",
          "categoria": "Áridos y agregados"
        }
      ]
    }
  }
}
```

Para confirmar, repita la solicitud con `"confirmarDuplicado": true`.

---

### 4.3 `GET /api/productos/:id`

**Respuesta 200:** igual al objeto `datos` del alta, con `unidadesComercializacion`.

**404 NO_ENCONTRADO:**

```json
{
  "error": {
    "codigo": "NO_ENCONTRADO",
    "mensaje": "El producto solicitado no existe."
  }
}
```

**400 DATOS_INVALIDOS** si el ID no es entero positivo.

---

### 4.4 `PUT /api/productos/:id`

Reemplaza los datos editables de un producto existente: nombre, código,
descripción, categoría, unidad de referencia, indicador fraccionado y unidades
adicionales. El cuerpo usa el mismo formato y las mismas validaciones que
`POST /api/productos`; envíe el producto completo, no solo los campos que
cambiaron.

La operación es `PUT` porque la interfaz guarda una representación completa del
formulario. Las unidades adicionales se sustituyen dentro de una transacción:
si una validación o inserción falla, no se conserva una actualización parcial.
El estado no cambia por esta ruta; se mantiene la operación especializada de la
siguiente sección.

Respuestas: `200` con el producto actualizado; `400 DATOS_INVALIDOS`, `404
NO_ENCONTRADO`, `409 CODIGO_DUPLICADO` o `409 POSIBLE_DUPLICADO` según
corresponda.

### 4.5 `PATCH /api/productos/:id/estado`

Activa o desactiva sin borrar.

#### Cuerpo

```json
{ "estado": "inactivo" }
```

Valores permitidos: `activo`, `inactivo`.

**Respuesta 200:**

```json
{
  "datos": {
    "id": 8,
    "estado": "inactivo",
    "actualizadoEn": "2026-10-27T22:45:00.000Z"
  },
  "mensaje": "Producto desactivado."
}
```

**404** si el producto no existe.
**400** si el estado no es válido.

---

## 5. Categorías

### `GET /api/categorias`

**Respuesta 200:**

```json
{
  "datos": [
    { "id": 4, "nombre": "Áridos y agregados", "productos": 3 },
    { "id": 11, "nombre": "Adhesivos y selladores", "productos": 0 }
  ]
}
```

`productos` es el número de productos que usan la categoría como referencia.

### `POST /api/categorias`

#### Cuerpo

```json
{ "nombre": "Cerraduras" }
```

**Respuesta 201:**

```json
{
  "datos": { "id": 13, "nombre": "Cerraduras" },
  "mensaje": "Categoría creada correctamente."
}
```

**409 CATEGORIA_DUPLICADA** si ya existe (sin distinguir mayúsculas ni tildes).

---

## 6. Unidades

### `GET /api/unidades`

**Respuesta 200:**

```json
{
  "datos": [
    { "id": 1, "nombre": "Unidad", "abreviatura": "und", "productos": 2 },
    { "id": 24, "nombre": "Cubeta", "abreviatura": "cubeta", "productos": 0 }
  ]
}
```

### `POST /api/unidades`

#### Cuerpo

```json
{ "nombre": "Barril", "abreviatura": "brl" }
```

**Respuesta 201:**

```json
{
  "datos": { "id": 28, "nombre": "Barril", "abreviatura": "brl" },
  "mensaje": "Unidad creada correctamente."
}
```

**409 UNIDAD_DUPLICADA** si el nombre o la abreviatura ya existen.

---

## 7. Respaldos

### `GET /api/respaldos`

**Respuesta 200:**

```json
{
  "datos": [
    {
      "nombre": "ferreteria_20261027_164307.dump",
      "tamano": 17858,
      "creadoEn": "2026-10-27T21:29:01.000Z",
      "descarga": "/api/respaldos/ferreteria_20261027_164307.dump/descargar"
    }
  ]
}
```

### `POST /api/respaldos`

Genera un respaldo real con `pg_dump`.

**Respuesta 201:**

```json
{
  "datos": {
    "nombre": "ferreteria_20261027_223000.dump",
    "tamano": 20123,
    "creadoEn": "2026-10-27T22:30:00.000Z",
    "descarga": "/api/respaldos/ferreteria_20261027_223000.dump/descargar"
  },
  "mensaje": "Respaldo generado correctamente."
}
```

**500 RESPALDO_FALLIDO** si `pg_dump` no está disponible o falla. El archivo parcial se elimina.

### `GET /api/respaldos/:archivo/descargar`

Descarga el archivo. Solo acepta nombres con el patrón `ferreteria_AAAAMMDD_HHMMSS[_N].dump` y evita salir de la carpeta de respaldos.

**404 NO_ENCONTRADO** si el nombre no es válido o el archivo no existe.

---

## 8. Códigos de error

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | Validación de campos |
| 400 | `JSON_INVALIDO` | Cuerpo JSON mal formado |
| 400 | `REFERENCIA_INVALIDA` | FK inexistente o en uso |
| 400 | `DATO_INVALIDO` | Restricción de base (`23514`, `22P02`) |
| 403 | `ORIGEN_NO_PERMITIDO` | Origen CORS no permitido |
| 404 | `NO_ENCONTRADO` | Recurso o ruta inexistente |
| 409 | `CODIGO_DUPLICADO` | Código de producto repetido |
| 409 | `POSIBLE_DUPLICADO` | Nombre exacto en la misma categoría |
| 409 | `CATEGORIA_DUPLICADA` | Categoría repetida |
| 409 | `UNIDAD_DUPLICADA` | Unidad o abreviatura repetida |
| 409 | `UNIDAD_REPETIDA` | Unidad repetida dentro del producto |
| 500 | `RESPALDO_FALLIDO` | Error de `pg_dump` |
| 500 | `ERROR_INTERNO` | Error inesperado |
| 503 | `BASE_DATOS_NO_DISPONIBLE` | PostgreSQL apagado o credenciales incorrectas |

---

## 9. Ejemplos con PowerShell

### Crear un producto

```powershell
$cuerpo = @{
  nombre = "Arena fina"
  codigo = "AR-001"
  categoriaId = 4
  unidadReferenciaId = 9
  esFraccionado = $true
  unidadesComercializacion = @(
    @{ unidadId = 24; equivalencia = $null; notaEquivalencia = "Pendiente de confirmar" }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/productos `
  -ContentType "application/json" -Body $cuerpo
```

### Buscar

```powershell
Invoke-RestMethod "http://localhost:4000/api/productos?busqueda=arena&estado=activo"
```

### Cambiar estado

```powershell
Invoke-RestMethod -Method Patch -Uri http://localhost:4000/api/productos/1/estado `
  -ContentType "application/json" -Body '{"estado":"inactivo"}'
```

### Generar respaldo

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/respaldos
```

---

## 10. Límites y comportamiento

- Cuerpo JSON máximo: `BODY_LIMIT` (100 KB por defecto).
- Página máxima: 100 registros.
- Búsqueda máxima: 100 caracteres.
- Unidades adicionales por producto: 20.
- Sin paginación en categorías y unidades (son catálogos pequeños).
- No hay endpoint de borrado. La edición completa se realiza con `PUT /api/productos/:id`.
- Sin autenticación.
- Sin versionado de API (`/api`, no `/api/v1`).
