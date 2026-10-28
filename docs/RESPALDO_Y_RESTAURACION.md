# Respaldo y restauración

## 1. Principio

Un respaldo solo sirve si **existe, tiene contenido y puede restaurarse**. Este proyecto no simula respaldos ni descargas: ejecuta `pg_dump` real, verifica el archivo y permite descargarlo. La restauración se hace fuera de la interfaz, con confirmación explícita, para evitar sobrescrituras accidentales.

---

## 2. Qué contiene un respaldo

El comando usado es:

```text
pg_dump --format=custom --compress=6 --no-owner --no-privileges
```

Incluye:

- Estructura de las tablas, restricciones, índices, extensión y trigger.
- Datos de `categorias`, `unidades_medida`, `productos` y `producto_unidades`.

No incluye:

- Roles ni contraseñas (por `--no-owner --no-privileges`).
- El archivo `.env`.
- Los archivos de la aplicación.
- Los propios respaldos anteriores.

El formato *custom* permite restaurar con `pg_restore`, elegir objetos y comprimir. El archivo resultante es binario; **no lo abra con Notepad**.

---

## 3. Generar un respaldo desde la interfaz

1. Abra <http://localhost:4000/respaldos>.
2. Pulse **Generar respaldo**.
3. Espere el mensaje de éxito.
4. En **Respaldos disponibles**, pulse **Descargar**.
5. Guarde el archivo en otro disco, USB o carpeta de red.

El backend:

1. Crea `backups/` si no existe.
2. Genera un nombre `ferreteria_AAAAMMDD_HHMMSS.dump`.
3. Ejecuta `pg_dump` contra la base de `.env`.
4. Comprueba que el archivo exista y no esté vacío.
5. Si falla, elimina el archivo parcial.
6. Devuelve nombre, tamaño, fecha y enlace de descarga.

La descarga es real: Express envía el archivo con `res.download`.

---

## 4. Generar un respaldo desde PowerShell

```powershell
npm.cmd run respaldo
```

O directamente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/respaldo.ps1
```

Para elegir otra carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/respaldo.ps1 -Destino "D:\Respaldos\Ferreteria"
```

El script lee `.env`, usa `PG_DUMP_PATH` y guarda el archivo con marca de tiempo.

### Salida esperada

```text
Generando respaldo en C:\Proyectos\Ferreteria\backups\ferreteria_20261027_164307.dump...
Respaldo creado: C:\Proyectos\Ferreteria\backups\ferreteria_20261027_164307.dump
```

---

## 5. Verificar un respaldo (obligatorio)

### 5.1 Comprobar que el archivo existe y no está vacío

```powershell
Get-Item backups\ferreteria_20261027_164307.dump | Select-Object Name, Length, LastWriteTime
```

### 5.2 Listar el contenido sin restaurar

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --list backups\ferreteria_20261027_164307.dump
```

Debe mostrar entradas como:

```text
Table: categorias
Table: unidades_medida
Table: productos
Table: producto_unidades
Index: productos_codigo_unico
...
```

Si el comando falla, el archivo está corrupto o no es un dump *custom*.

### 5.3 Restaurar en una base de prueba

Nunca verifique un respaldo restaurándolo primero sobre la base en uso. Cree una base aparte:

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app -E UTF8 ferreteria_restauracion
Remove-Item Env:PGPASSWORD
```

Restaure:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restaurar.ps1 `
  -Archivo backups\ferreteria_20261027_164307.dump `
  -BaseDestino ferreteria_restauracion
```

Escriba `RESTAURAR` cuando se solicite.

Verifique conteos:

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria_restauracion -c "SELECT (SELECT count(*) FROM productos) AS productos, (SELECT count(*) FROM categorias) AS categorias, (SELECT count(*) FROM unidades_medida) AS unidades;"
Remove-Item Env:PGPASSWORD
```

Compare con la base original:

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria -c "SELECT (SELECT count(*) FROM productos) AS productos, (SELECT count(*) FROM categorias) AS categorias, (SELECT count(*) FROM unidades_medida) AS unidades;"
Remove-Item Env:PGPASSWORD
```

También puede abrir la aplicación apuntando temporalmente a la base restaurada, o consultar algunos productos:

```sql
SELECT id, codigo, nombre, estado FROM productos ORDER BY id LIMIT 20;
```

---

## 6. Restaurar sobre la base en uso

Use esta opción solo si la base actual está dañada y ya tiene un respaldo de seguridad.

### Paso 1 — Detener la aplicación

`Ctrl+C` en la terminal donde corre `npm.cmd start`. Nadie debe estar escribiendo.

### Paso 2 — Generar un respaldo de seguridad de la base actual

Aunque esté dañada, si es posible:

```powershell
npm.cmd run respaldo
```

### Paso 3 — Restaurar con confirmación explícita

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restaurar.ps1 `
  -Archivo backups\ferreteria_20261027_164307.dump `
  -BaseDestino ferreteria `
  -Confirmar
```

El script advierte que `--clean --if-exists` elimina los objetos existentes en la base de destino. `-Confirmar` evita la pregunta interactiva, pero **no** debe usarse a ciegas.

Sin `-Confirmar`, el script pide escribir `RESTAURAR`.

### Paso 4 — Verificar

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app -d ferreteria -c "SELECT count(*) FROM productos;"
Remove-Item Env:PGPASSWORD
```

### Paso 5 — Reiniciar la aplicación

```powershell
npm.cmd start
```

Abra el catálogo y compruebe varios productos, categorías y unidades.

---

## 7. Restauración manual con `pg_restore`

Si prefiere no usar el script:

```powershell
$env:PGPASSWORD = "su_contrasena"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  --host 127.0.0.1 `
  --port 5433 `
  --username ferreteria_app `
  --dbname ferreteria_restauracion `
  --clean --if-exists `
  --no-owner --no-privileges `
  backups\ferreteria_20261027_164307.dump
Remove-Item Env:PGPASSWORD
```

Sustituya `5433` por su puerto real (`5432` si usa el servicio normal).

> `--clean` elimina los objetos existentes en la base de destino. Confirme dos veces el nombre de la base.

---

## 8. Frecuencia y retención

Recomendación inicial:

| Momento | Acción |
|---|---|
| Antes de cargar datos masivos | Respaldo manual + verificación |
| Antes de cambiar el esquema | Respaldo manual + verificación |
| Diario al cerrar | Respaldo automático |
| Semanal | Copia fuera del equipo (USB, NAS, nube privada) |
| Mensual | Prueba de restauración en `ferreteria_restauracion` |

Retención sugerida: conservar al menos **30 respaldos diarios** y **12 mensuales**. Ajuste según el volumen y las políticas del negocio.

### Programar con el Programador de tareas

1. Abra **Programador de tareas**.
2. **Crear tarea básica**.
3. Nombre: `Respaldo Ferretería`.
4. Desencadenador: diario, hora de cierre.
5. Acción: **Iniciar un programa**.
6. Programa: `powershell.exe`.
7. Argumentos:

   ```text
   -NoProfile -ExecutionPolicy Bypass -File "C:\Proyectos\Ferreteria\scripts\respaldo.ps1" -Destino "D:\Respaldos\Ferreteria"
   ```

8. Marque **Ejecutar aunque el usuario no haya iniciado sesión** solo si la cuenta tiene permisos sobre la base y la carpeta.
9. Guarde y ejecute una vez para probar.

> Los respaldos locales no protegen contra robo, incendio o fallo total del disco. Mantenga una copia fuera del equipo.

---

## 9. Seguridad de los respaldos

- Un `.dump` contiene **todos los datos del catálogo**. Trátelo como información confidencial.
- No lo envíe por correo ni lo suba a servicios públicos.
- Guarde las copias en una carpeta con permisos restringidos.
- La carpeta `backups/` está excluida de Git.
- Las contraseñas no están dentro del dump (no se incluyen roles), pero el contenido comercial sí.
- Si el respaldo se filtra, cualquier persona con PostgreSQL puede leerlo.

---

## 10. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `pg_dump no se encontró` | Ruta incorrecta o no está en PATH | Configure `PG_DUMP_PATH` en `.env` |
| `pg_dump: error: connection ...` | Base apagada o credenciales incorrectas | Revise `DB_*` y `/api/salud` |
| `pg_dump: error: server version ...` | `pg_dump` más antiguo que el servidor | Use el `pg_dump` de la misma versión o superior |
| `pg_restore: error: could not execute query` | Objetos existentes o permisos | Use `--clean --if-exists` y una base de destino correcta |
| `permission denied` al escribir | Carpeta sin permisos | Use una carpeta propia o ejecute con permisos |
| El archivo pesa 0 bytes | Fallo de `pg_dump` | El servicio lo elimina; revise el error y reintente |
| `database ... does not exist` | Base de destino no creada | Use `createdb` antes de restaurar |

---

## 11. Evidencia de la verificación realizada

Durante el desarrollo se generó un respaldo real:

```text
backups/ferreteria_20261027_164307.dump
17.858 bytes
```

Se verificó con:

```powershell
pg_restore --list backups\ferreteria_20261027_164307.dump
```

Y se restauró en `ferreteria_restauracion`. Los conteos coincidieron con la base de origen: **8 productos, 12 categorías y 27 unidades**.

> Esa base de restauración contiene datos de prueba. Puede eliminarla cuando ya no la necesite:
>
> ```powershell
> $env:PGPASSWORD = "su_contrasena"
> & "C:\Program Files\PostgreSQL\18\bin\dropdb.exe" -h 127.0.0.1 -p 5433 -U ferreteria_app ferreteria_restauracion
> Remove-Item Env:PGPASSWORD
> ```

Los detalles de las pruebas están en [PRUEBAS.md](PRUEBAS.md).
