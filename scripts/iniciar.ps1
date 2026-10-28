# Arranque cotidiano V1.1 - Ferretería La Panameña
# NO crea bases, roles, tablas, esquemas, catálogos ni datos de demostración.
# Solo valida, comprueba disponibilidad y conexión real a PostgreSQL.
# Si falla, muestra diagnóstico claro y pasos para resolver. NO repara automáticamente.

$ErrorActionPreference = 'Stop'

function Escribir-Info($mensaje) { Write-Host "[iniciar] $mensaje" -ForegroundColor Cyan }
function Escribir-Ok($mensaje)   { Write-Host "[iniciar] OK: $mensaje" -ForegroundColor Green }
function Escribir-Err($mensaje)  { Write-Host "[iniciar] ERROR: $mensaje" -ForegroundColor Red }
function Escribir-Ayuda($mensaje){ Write-Host "[iniciar] $mensaje" -ForegroundColor Yellow }

$raiz = Split-Path -Parent $PSScriptRoot

# 1) Validar .env
$envPath = Join-Path $raiz '.env'
if (-not (Test-Path $envPath)) {
  Escribir-Err ".env no existe"
  Escribir-Ayuda "Copie .env.example a .env y complete los valores (sin comillas innecesarias)."
  exit 1
}

function Leer-Env([string]$ruta) {
  $mapa = @{}
  Get-Content $ruta | ForEach-Object {
    $linea = $_.Trim()
    if ($linea -eq '' -or $linea.StartsWith('#')) { return }
    if ($linea -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $valor = $matches[2].Trim()
      if (($valor.StartsWith('"') -and $valor.EndsWith('"')) -or ($valor.StartsWith("'") -and $valor.EndsWith("'"))) {
        $valor = $valor.Substring(1, $valor.Length - 2)
      }
      $mapa[$matches[1]] = $valor
    }
  }
  return $mapa
}

$config = Leer-Env $envPath
$requeridas = @('DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','PORT')
foreach ($r in $requeridas) {
  if (-not $config.ContainsKey($r) -or [string]::IsNullOrWhiteSpace($config[$r])) {
    Escribir-Err "Falta variable requerida en .env: $r"
    Escribir-Ayuda "Revise .env.example y complete las credenciales. No se mostrarán valores sensibles."
    exit 1
  }
}
Escribir-Ok "Variables .env validadas"

# 2) Validar dependencias
$backendNodeModules = Join-Path $raiz 'backend\node_modules'
$frontendNodeModules = Join-Path $raiz 'frontend\node_modules'
if (-not (Test-Path $backendNodeModules)) {
  Escribir-Err "Faltan dependencias de backend (backend/node_modules)"
  Escribir-Ayuda "Ejecute: npm run instalar (o npm --prefix backend install)"
  exit 1
}
if (-not (Test-Path $frontendNodeModules)) {
  Escribir-Err "Faltan dependencias de frontend (frontend/node_modules)"
  Escribir-Ayuda "Ejecute: npm run instalar (o npm --prefix frontend install)"
  exit 1
}
Escribir-Ok "Dependencias presentes (backend/node_modules, frontend/node_modules)"

# 3) Validar build frontend servido por backend
$frontendDistIndex = Join-Path $raiz 'frontend\dist\index.html'
if (-not (Test-Path $frontendDistIndex)) {
  Escribir-Err "frontend/dist/index.html no existe"
  Escribir-Ayuda "Para servir la app con el backend, compile el frontend: npm run build"
  Escribir-Ayuda "O use iniciar:dev para desarrollo con Vite."
  exit 1
}
Escribir-Ok "frontend/dist/index.html encontrado"

# 4) Comprobar puerto
$puertoApi = [int]$config['PORT']
try {
  $conexiones = Get-NetTCPConnection -LocalPort $puertoApi -State Listen -ErrorAction SilentlyContinue
  if ($conexiones) {
    # El puerto está ocupado: comprobar si es esta misma API ya en ejecución.
    $apiPropia = $false
    try {
      $urlSalud = "http://127.0.0.1:$puertoApi/api/salud"
      $respuesta = Invoke-WebRequest -Uri $urlSalud -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      if ($respuesta.StatusCode -eq 200) {
        $salud = $respuesta.Content | ConvertFrom-Json
        if ($salud.servicio -eq 'ferreteria-api' -and $salud.estado -eq 'ok' -and $salud.baseDatos -eq 'conectada') {
          $apiPropia = $true
        }
      }
    } catch {
      $apiPropia = $false
    }

    if ($apiPropia) {
      Escribir-Ok "Ferretería La Panameña ya está en ejecución en http://localhost:$puertoApi"
      Escribir-Ayuda "No se inició otra instancia ni se detuvo ningún proceso."
      exit 0
    }

    Escribir-Err "Puerto $puertoApi ya está en uso y no corresponde a una API de Ferretería en buen estado"
    Escribir-Ayuda "No se detuvo ningún proceso. Verifique qué aplicación usa el puerto o revise http://localhost:$puertoApi/api/salud"
    exit 1
  }
  Escribir-Ok "Puerto $puertoApi libre"
} catch {
  Escribir-Ayuda "No se pudo comprobar el puerto con Get-NetTCPConnection (puede requerir permisos). Se continuará."
}

# 5) Comprobar PostgreSQL y conexión real
$pgHost = $config['DB_HOST']
$pgPort = [int]$config['DB_PORT']
$pgDb   = $config['DB_NAME']
$pgUser = $config['DB_USER']

function Buscar-BinPostgres {
  $candidatos = @()
  if ($env:PG_BIN) { $candidatos += $env:PG_BIN }
  $comando = Get-Command pg_isready.exe -ErrorAction SilentlyContinue
  if ($comando) { $candidatos += (Split-Path -Parent $comando.Source) }
  foreach ($version in @('18','17','16','15','14')) {
    $candidatos += "C:\Program Files\PostgreSQL\$version\bin"
  }
  foreach ($c in $candidatos) {
    if ($c -and (Test-Path (Join-Path $c 'pg_isready.exe'))) { return $c }
  }
  return $null
}

$binPg = Buscar-BinPostgres
$pgIsReady = if ($binPg) { Join-Path $binPg 'pg_isready.exe' } else { 'pg_isready.exe' }
$psql      = if ($binPg) { Join-Path $binPg 'psql.exe' } else { 'psql.exe' }

# Comprobar si hay algo escuchando en puerto PG
try {
  $pgListen = Get-NetTCPConnection -LocalPort $pgPort -State Listen -ErrorAction SilentlyContinue
  if (-not $pgListen) {
    Escribir-Err "PostgreSQL no escucha en $pgHost`:$pgPort"
    Escribir-Ayuda "Pasos para resolver (investigar por separado, sin reparación automática):"
    Escribir-Ayuda "  1) Si usa clúster local: npm.cmd run db:local:estado"
    Escribir-Ayuda "  2) Si usa servicio PostgreSQL de Windows: verifique el servicio 'postgresql-x64-...' en services.msc"
    Escribir-Ayuda "  3) Si usa clúster local detenido: npm.cmd run db:local:iniciar (solo si está preparado para inicializarlo manualmente)"
    Escribir-Ayuda "  4) Revise logs: .local\postgres.log si existe"
    exit 1
  }
} catch {
  Escribir-Ayuda "No se pudo comprobar si PostgreSQL escucha en el puerto (continuando con pg_isready)."
}

# pg_isready
try {
  & $pgIsReady -h $pgHost -p $pgPort -q | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Escribir-Err "pg_isready indica que PostgreSQL no acepta conexiones en $pgHost`:$pgPort"
    Escribir-Ayuda "Revise el estado del servidor PostgreSQL. No se intenta reiniciar/crear/reparar el clúster."
    exit 1
  }
  Escribir-Ok "PostgreSQL acepta conexiones ($pgHost`:$pgPort)"
} catch {
  Escribir-Err "No se encontró pg_isready para validar PostgreSQL"
  Escribir-Ayuda "Instale cliente PostgreSQL o defina PG_BIN. No se intenta reparar automáticamente."
  exit 1
}

# Conexión real con usuario de app
$env:PGPASSWORD = $config['DB_PASSWORD']
try {
  & $psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb -tAc "SELECT 1;" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Escribir-Err "No se pudo conectar con DB_USER/DB_PASSWORD a $pgDb"
    Escribir-Ayuda "Verifique credenciales en .env. No se crean roles/bases automáticamente."
    Escribir-Ayuda "Si usa clúster local, asegúrese de que fue preparado con las credenciales correctas."
    exit 1
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Escribir-Ok "Conexión real verificada con usuario de aplicación"
} catch {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Escribir-Err "Fallo al verificar conexión con psql"
  Escribir-Ayuda "Verifique pg_hba.conf, rol y base. No se realizan cambios automáticos."
  exit 1
}

Escribir-Ok "Arranque cotidiano validado. Iniciando backend..."
& npm.cmd --prefix (Join-Path $raiz 'backend') start
exit $LASTEXITCODE
