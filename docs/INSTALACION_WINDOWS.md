# Instalación en Windows

Guía paso a paso para dejar la aplicación funcionando en un equipo Windows 10 u 11.

---

## 1. Requisitos

| Componente | Versión mínima | Verificado con |
|---|---|---|
| Windows | 10 u 11 | Windows 11 |
| Node.js | 22.12 | 24.x |
| npm | incluido con Node | 11.x |
| PostgreSQL | 14 | 18.6 |
| PowerShell | 5.1 | 5.1 / 7 |

Compruebe en PowerShell:

```powershell
node --version
npm.cmd --version
psql --version
```

Si `psql` no se reconoce, agregue `C:\Program Files\PostgreSQL\18\bin` al `PATH` o use rutas completas.

---

## 2. Instalar Node.js

1. Descargue el instalador LTS desde <https://nodejs.org/>.
2. Ejecute el instalador y acepte las opciones por defecto.
3. Abra una terminal nueva y compruebe:

```powershell
node --version
npm.cmd --version
```

> En algunos equipos PowerShell bloquea `npm.ps1`. Use siempre `npm.cmd` o ajuste la directiva:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

---

## 3. Instalar PostgreSQL

Tiene dos opciones.

### Opción A — Servicio PostgreSQL normal (puerto 5432)

1. Descargue PostgreSQL desde <https://www.postgresql.org/download/windows/>.
2. Ejecute el instalador.
3. Anote la contraseña del usuario `postgres`.
4. Deje el puerto **5432**.
5. Al finalizar, abra **SQL Shell (psql)** o use PowerShell.

Cree el usuario y la base:

```powershell
$env:PGPASSWORD = "CONTRASENA_DEL_POSTGRES"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -c "CREATE ROLE ferreteria_app LOGIN PASSWORD 'CONTRASENA_DE_LA_APP';"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres -h 127.0.0.1 -p 5432 -O ferreteria_app -E UTF8 ferreteria
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres -h 127.0.0.1 -p 5432 -O ferreteria_app -E UTF8 ferreteria_test
Remove-Item Env:PGPASSWORD
```

Luego configure `.env` con `DB_PORT=5432`.

### Opción B — Clúster local del proyecto (puerto 5433) — recomendada para probar

No toca el servicio existente. Los scripts crean un clúster dentro de `.local/pgdata`.

Requisito: PostgreSQL debe estar instalado (para tener `initdb`, `pg_ctl`, `psql`, `pg_dump`). No es necesario que el servicio esté corriendo.

> **Importante:** este comando necesita `DB_PASSWORD` en `.env`. Si todavía no creó el archivo, complete primero la **sección 5** y luego vuelva aquí.

```powershell
npm.cmd run db:local:iniciar
```

El script:

- Crea `.local/pgdata` si no existe.
- Usa el puerto **5433** (puede cambiarlo con `LOCAL_PG_PORT`).
- Crea el rol `ferreteria_app` con `DB_PASSWORD` de `.env`.
- Crea `ferreteria` y `ferreteria_test`.
- Guarda la contraseña del superusuario en `.local/postgres-password.txt`.

Configure `.env` con `DB_PORT=5433`.

> Si el puerto 5433 también está ocupado, defina otro:
>
> ```powershell
> $env:LOCAL_PG_PORT = "5434"
> npm.cmd run db:local:iniciar
> ```
>
> Y ajuste `DB_PORT` en `.env`.

---

## 4. Copiar el proyecto

Copie la carpeta completa a una ruta sin problemas de permisos, por ejemplo:

```text
C:\Proyectos\Ferreteria
```

Evite `C:\Program Files` y rutas con caracteres especiales.

---

## 5. Crear `.env`

En la raíz del proyecto:

```powershell
Copy-Item .env.example .env
notepad .env
```

Ejemplo para el clúster local:

```dotenv
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ferreteria
DB_USER=ferreteria_app
DB_PASSWORD=una_contrasena_larga_y_unica

PG_DUMP_PATH=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
PG_RESTORE_PATH=C:\Program Files\PostgreSQL\18\bin\pg_restore.exe
RESPALDO_DIR=backups
BODY_LIMIT=100kb
```

Reglas:

- `DB_PASSWORD` no debe contener comillas simples sin escapar.
- No suba `.env` a Git.
- No reutilice la contraseña de `postgres`.
- Si usa el servicio normal, cambie `DB_PORT` a `5432` y ajuste las rutas de `pg_dump`/`pg_restore` si su versión no es 18.

---

## 6. Instalar dependencias

```powershell
npm.cmd run instalar
```

Esto instala backend y frontend. Puede tardar unos minutos.

Si falla por red corporativa, configure el proxy de npm o use una red sin restricciones.

---

## 7. Aplicar el esquema

```powershell
npm.cmd run db:esquema
```

Debe mostrar:

```text
Aplicando esquema en ferreteria (127.0.0.1:5433)...
Cargando categorías y unidades iniciales...
Esquema aplicado correctamente.
```

Verifique:

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria -c "\dt"
Remove-Item Env:PGPASSWORD
```

Debe listar `categorias`, `productos`, `producto_unidades` y `unidades_medida`.

### Datos de demostración (opcional)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aplicar-esquema.ps1 -Demo
```

Carga 8 productos `[DEMO]`. No son datos reales.

---

## 8. Compilar el frontend

```powershell
npm.cmd run build
```

Debe terminar con:

```text
✓ built in ...
```

Los archivos quedan en `frontend/dist`. Express los sirve automáticamente.

---

## 9. Iniciar la aplicación

```powershell
npm.cmd start
```

Salida esperada:

```text
[base de datos] Conectada a ferreteria en 127.0.0.1:5433
[api] Ferretería La Panameña escuchando en http://localhost:4000
[api] Salud: http://localhost:4000/api/salud
```

Abra <http://localhost:4000>.

Para detener: `Ctrl+C`.

---

## 10. Modo desarrollo con VS Code

1. Abra la carpeta del proyecto en VS Code: **Archivo → Abrir carpeta**.
2. Abra dos terminales integradas (`Ctrl+Ñ` o **Terminal → Nueva terminal**).

**Terminal 1:**

```powershell
npm.cmd run dev:backend
```

**Terminal 2:**

```powershell
npm.cmd run dev:frontend
```

Abra <http://localhost:5173>. Vite recarga al guardar cambios y reenvía `/api` al backend.

Extensiones útiles (opcionales):

- **ESLint** (si se agrega configuración).
- **Prettier** (si se adopta formato automático).
- **PostgreSQL** de Microsoft o **SQLTools** para explorar la base.
- **Error Lens** para ver errores en línea.

No es necesario instalar nada más para que el proyecto funcione.

---

## 11. Inicio automático (opcional)

### Aplicación

Cree un acceso directo en el menú Inicio:

```powershell
$accion = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d C:\Proyectos\Ferreteria && npm.cmd start"
$disparador = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Ferreteria Catalogo" -Action $accion -Trigger $disparador -Description "Inicia el catálogo local"
```

> Ajuste la ruta. La tarea se ejecutará al iniciar sesión. Verifique que PostgreSQL local también esté iniciado.

### PostgreSQL local

El clúster del proyecto no se registra como servicio de Windows. Para iniciarlo al arrancar, cree una tarea similar que ejecute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Proyectos\Ferreteria\scripts\local-db.ps1 iniciar
```

O use el servicio PostgreSQL normal, que ya se inicia con Windows.

---

## 12. Acceso desde otro equipo de la red (opcional)

Por defecto la aplicación escucha en todas las interfaces (`app.listen` sin host), pero:

- PostgreSQL local escucha solo en `127.0.0.1` (seguro).
- CORS solo permite `localhost`/`127.0.0.1` y los orígenes de `FRONTEND_ORIGIN`.
- No hay autenticación.

Si necesita acceso desde otro equipo:

1. Agregue el origen a `.env`, por ejemplo `FRONTEND_ORIGIN=http://192.168.1.50:4000`.
2. Reinicie el backend.
3. Permita el puerto 4000 en el Firewall de Windows.
4. **No exponga la aplicación a internet.** Para una red, agregue autenticación y HTTPS primero.

---

## 13. Solución de problemas

### “No se pudo conectar con PostgreSQL”

- Verifique que el servicio o clúster esté iniciado:

  ```powershell
  npm.cmd run db:local:estado
  ```

- Revise `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
- Compruebe el puerto:

  ```powershell
  Test-NetConnection 127.0.0.1 -Port 5433
  ```

- Abra <http://localhost:4000/api/salud>; debe indicar `baseDatos: "conectada"`.

### “Falta la variable de entorno ...”

Copie `.env.example` a `.env` y complete los valores. El backend se detiene si falta `DB_NAME`, `DB_USER` o `DB_PASSWORD`.

### “password authentication failed”

- La contraseña de `.env` no coincide con la del rol.
- En el clúster local, puede recrear el rol (con respaldo previo) o revisar `.local/postgres-password.txt` para el superusuario.
- No cambie la contraseña a mano sin actualizar `.env`.

### “port 4000 already in use”

Otro proceso usa el puerto. Cambie `PORT` en `.env` o detenga el proceso:

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

### “pg_dump no se encontró”

Configure la ruta completa en `.env`:

```dotenv
PG_DUMP_PATH=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
PG_RESTORE_PATH=C:\Program Files\PostgreSQL\18\bin\pg_restore.exe
```

Compruebe que la versión de `pg_dump` sea igual o superior a la del servidor.

### La página se ve sin estilos o sin JavaScript

- Ejecute `npm.cmd run build` después de cambiar el frontend.
- Reinicie el backend.
- Recargue con `Ctrl+F5`.
- Revise la consola del navegador. Si hay `403` en `/assets/...`, confirme que `PORT` en `.env` coincide con el puerto real y que el origen propio está permitido (el backend lo agrega automáticamente).

### “npm no se reconoce” o error de directiva de ejecución

Use `npm.cmd`:

```powershell
npm.cmd run build
```

O ajuste:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Los acentos se ven raros en la consola

Es solo la consola de PowerShell. Los archivos y la base están en UTF-8. Verifique en el navegador o con `psql` configurado en UTF-8.

### El respaldo falla

- Verifique que `pg_dump` exista y sea de la misma versión o superior.
- Compruebe que la carpeta `backups` tenga permisos de escritura.
- Revise que la base esté disponible.
- El servicio elimina archivos parciales para no confundirlos con respaldos válidos.

---

## 14. Lista de verificación final

- [ ] `node --version` ≥ 22.12.
- [ ] PostgreSQL iniciado y accesible.
- [ ] `.env` creado y con contraseña propia.
- [ ] `npm.cmd run instalar` sin errores.
- [ ] `npm.cmd run db:esquema` aplicado.
- [ ] `npm.cmd run build` exitoso.
- [ ] `npm.cmd start` muestra conexión a la base.
- [ ] <http://localhost:4000/api/salud> responde `ok`.
- [ ] La página de inicio carga con estilos.
- [ ] Se puede registrar un producto de prueba.
- [ ] Se puede generar y descargar un respaldo.
- [ ] Se verificó una restauración en una base aparte.
- [ ] Se eliminaron los datos `[DEMO]` si no se usarán.
