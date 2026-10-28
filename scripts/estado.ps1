# Diagnóstico de solo lectura - Ferretería La Panameña
# Comprueba API, PostgreSQL local, archivos y dependencias sin cambiar nada.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/estado.ps1
#
# Códigos de salida:
#   0 = listo para abrir: API propia saludable, PostgreSQL disponible y archivos completos.
#   1 = sistema detenido: puerto de la API libre, PostgreSQL disponible y archivos completos.
#   2 = requiere revisión: API no identificada/sin respuesta, PostgreSQL no disponible,
#       archivos faltantes o error de comprobación.
#
# No inicia, detiene ni reinicia procesos. No modifica bases ni configuraciones.
# No muestra credenciales ni el contenido de .env.

param(
  [switch]$SoloFunciones
)

$ErrorActionPreference = 'Stop'

function Escribir-Titulo($mensaje) { Write-Host $mensaje -ForegroundColor Cyan }
function Escribir-Ok($mensaje)     { Write-Host "  [OK]    $mensaje" -ForegroundColor Green }
function Escribir-Aviso($mensaje)  { Write-Host "  [AVISO] $mensaje" -ForegroundColor Yellow }
function Escribir-Err($mensaje)    { Write-Host "  [FALLO] $mensaje" -ForegroundColor Red }
function Escribir-Detalle($mensaje){ Write-Host "          $mensaje" -ForegroundColor DarkGray }

function Leer-Env([string]$ruta) {
  $mapa = @{}
  if (-not (Test-Path $ruta)) { return $mapa }
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

function Obtener-EstadoApi {
  param(
    [int]$Puerto = 4000,
    [string]$HostApi = '127.0.0.1',
    [int]$TimeoutSeg = 5
  )

  $resultado = [pscustomobject]@{
    Estado  = 'error_puerto'
    Pid     = $null
    Detalle = ''
    Url     = "http://${HostApi}:$Puerto"
  }

  try {
    $conexion = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
  } catch {
    $resultado.Estado = 'error_puerto'
    $resultado.Detalle = "No se pudo comprobar el puerto: $($_.Exception.Message)"
    return $resultado
  }

  if (-not $conexion) {
    $resultado.Estado = 'libre'
    $resultado.Detalle = "No hay ningún proceso escuchando en el puerto $Puerto."
    return $resultado
  }

  $resultado.Pid = $conexion.OwningProcess

  try {
    $respuesta = Invoke-WebRequest -Uri "$($resultado.Url)/api/salud" -UseBasicParsing -TimeoutSec $TimeoutSeg -ErrorAction Stop
    if ($respuesta.StatusCode -eq 200) {
      $salud = $respuesta.Content | ConvertFrom-Json
      if ($salud.servicio -eq 'ferreteria-api' -and $salud.estado -eq 'ok' -and $salud.baseDatos -eq 'conectada') {
        $resultado.Estado = 'saludable'
        $resultado.Detalle = 'API identificada y con base de datos conectada.'
      } else {
        $resultado.Estado = 'no_identificada'
        $resultado.Detalle = 'El puerto responde, pero /api/salud no confirma la identidad esperada.'
      }
    } else {
      $resultado.Estado = 'sin_respuesta'
      $resultado.Detalle = "HTTP $($respuesta.StatusCode) en /api/salud."
    }
  } catch {
    $resultado.Estado = 'sin_respuesta'
    $resultado.Detalle = "No se obtuvo una respuesta válida de /api/salud: $($_.Exception.Message)"
  }

  return $resultado
}

function Obtener-EstadoPostgres {
  param(
    [string]$PgHost = '127.0.0.1',
    [int]$PgPort = 5433,
    [string]$PgDb = 'ferreteria',
    [string]$PgUser = 'ferreteria_app',
    [string]$PgPassword = $null,
    [int]$TimeoutSeg = 5
  )

  $resultado = [pscustomobject]@{
    Estado  = 'error'
    Detalle = ''
  }

  try {
    $listener = Get-NetTCPConnection -LocalPort $PgPort -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
  } catch {
    $resultado.Estado = 'error'
    $resultado.Detalle = "No se pudo comprobar el puerto PostgreSQL: $($_.Exception.Message)"
    return $resultado
  }

  if (-not $listener) {
    $resultado.Estado = 'no_disponible'
    $resultado.Detalle = "No hay ningún proceso escuchando en $PgHost`:$PgPort."
    return $resultado
  }

  $bin = Buscar-BinPostgres
  if (-not $bin) {
    $resultado.Estado = 'error'
    $resultado.Detalle = 'No se encontraron los binarios de PostgreSQL (pg_isready/psql).'
    return $resultado
  }

  try {
    & (Join-Path $bin 'pg_isready.exe') -h $PgHost -p $PgPort -q 2>$null | Out-Null
  } catch {
    $resultado.Estado = 'error'
    $resultado.Detalle = 'No se pudo ejecutar pg_isready para comprobar PostgreSQL.'
    return $resultado
  }
  if ($LASTEXITCODE -ne 0) {
    $resultado.Estado = 'no_disponible'
    $resultado.Detalle = 'El puerto responde, pero pg_isready indica que no acepta conexiones.'
    return $resultado
  }

  if ([string]::IsNullOrWhiteSpace($PgPassword)) {
    $resultado.Estado = 'disponible_sin_verificar'
    $resultado.Detalle = 'PostgreSQL responde; no se pudo verificar la conexión de la app (faltan credenciales).'
    return $resultado
  }

  $env:PGPASSWORD = $PgPassword
  $env:PGCONNECT_TIMEOUT = "$TimeoutSeg"
  try {
    & (Join-Path $bin 'psql.exe') -h $PgHost -p $PgPort -U $PgUser -d $PgDb -w -tAc "SELECT 1;" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $resultado.Estado = 'disponible'
      $resultado.Detalle = 'Consulta de solo lectura SELECT 1 correcta.'
    } else {
      $resultado.Estado = 'disponible_sin_verificar'
      $resultado.Detalle = 'El servidor responde, pero la conexión con el usuario de la app falló.'
    }
  } catch {
    $resultado.Estado = 'error'
    $resultado.Detalle = 'No se pudo ejecutar la consulta de verificación con psql.'
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
  }

  return $resultado
}

function Obtener-EstadoArchivos {
  param([string]$Raiz)

  $items = @(
    @{ Nombre = '.env';                     Ruta = (Join-Path $Raiz '.env');                     Requerido = $true },
    @{ Nombre = 'package.json';             Ruta = (Join-Path $Raiz 'package.json');             Requerido = $true },
    @{ Nombre = 'backend/node_modules';     Ruta = (Join-Path $Raiz 'backend\node_modules');     Requerido = $true },
    @{ Nombre = 'frontend/node_modules';    Ruta = (Join-Path $Raiz 'frontend\node_modules');    Requerido = $true },
    @{ Nombre = 'frontend/dist/index.html'; Ruta = (Join-Path $Raiz 'frontend\dist\index.html'); Requerido = $true },
    @{ Nombre = 'scripts/iniciar.ps1';      Ruta = (Join-Path $Raiz 'scripts\iniciar.ps1');      Requerido = $true },
    @{ Nombre = 'scripts/local-db.ps1';     Ruta = (Join-Path $Raiz 'scripts\local-db.ps1');     Requerido = $true }
  )

  $detalle = foreach ($item in $items) {
    [pscustomobject]@{
      Nombre   = $item.Nombre
      Presente = (Test-Path $item.Ruta)
    }
  }

  $faltantes = @($detalle | Where-Object { -not $_.Presente })
  return [pscustomobject]@{
    Items     = @($detalle)
    Faltantes = $faltantes.Count
  }
}

if ($SoloFunciones) { return }

# ---------------------------------------------------------------------------
# Ejecución del diagnóstico (solo lectura)
# ---------------------------------------------------------------------------

$raiz = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $raiz '.env'
$config = Leer-Env $envPath

$puertoApi = if ($config['PORT']) { [int]$config['PORT'] } else { 4000 }
$pgHost    = if ($config['DB_HOST']) { $config['DB_HOST'] } else { '127.0.0.1' }
$pgPort    = if ($config['DB_PORT']) { [int]$config['DB_PORT'] } else { 5433 }
$pgDb      = if ($config['DB_NAME']) { $config['DB_NAME'] } else { 'ferreteria' }
$pgUser    = if ($config['DB_USER']) { $config['DB_USER'] } else { 'ferreteria_app' }
$pgPass    = $config['DB_PASSWORD']

Escribir-Titulo ''
Escribir-Titulo '=== Ferretería La Panameña - Diagnóstico del sistema ==='
Escribir-Titulo ''

# API
$api = Obtener-EstadoApi -Puerto $puertoApi
switch ($api.Estado) {
  'saludable'       { Escribir-Ok "API: saludable (PID $($api.Pid)) en http://localhost:$puertoApi" }
  'libre'           { Escribir-Aviso "API: puerto $puertoApi libre (el sistema no está iniciado)" }
  'no_identificada' { Escribir-Err "API: puerto $puertoApi ocupado por un servicio no identificado (PID $($api.Pid))" }
  'sin_respuesta'   { Escribir-Err "API: puerto $puertoApi ocupado, sin respuesta válida en /api/salud (PID $($api.Pid))" }
  default           { Escribir-Err "API: no se pudo comprobar el puerto $puertoApi" }
}
if ($api.Detalle) { Escribir-Detalle $api.Detalle }

# PostgreSQL local
$pg = Obtener-EstadoPostgres -PgHost $pgHost -PgPort $pgPort -PgDb $pgDb -PgUser $pgUser -PgPassword $pgPass
switch ($pg.Estado) {
  'disponible'              { Escribir-Ok "PostgreSQL: disponible en $pgHost`:$pgPort (SELECT 1 correcto)" }
  'disponible_sin_verificar'{ Escribir-Aviso "PostgreSQL: responde en $pgHost`:$pgPort, pero no se verificó la conexión de la app" }
  'no_disponible'           { Escribir-Err "PostgreSQL: no disponible en $pgHost`:$pgPort" }
  default                   { Escribir-Err 'PostgreSQL: error al comprobar el servidor' }
}
if ($pg.Detalle) { Escribir-Detalle $pg.Detalle }

# Archivos y dependencias
$archivos = Obtener-EstadoArchivos -Raiz $raiz
foreach ($item in $archivos.Items) {
  if ($item.Presente) {
    Escribir-Ok "Archivo: $($item.Nombre)"
  } else {
    Escribir-Err "Archivo: $($item.Nombre) (faltante)"
  }
}

# Resumen
$apiOk      = ($api.Estado -eq 'saludable')
$apiLibre   = ($api.Estado -eq 'libre')
$pgAcepta   = ($pg.Estado -eq 'disponible' -or $pg.Estado -eq 'disponible_sin_verificar')
$pgListo    = ($pg.Estado -eq 'disponible')
$archivosOk = ($archivos.Faltantes -eq 0)

Escribir-Titulo ''
if ($apiOk -and $pgAcepta -and $archivosOk) {
  Escribir-Ok 'Estado general: listo para abrir. La aplicación ya está en ejecución.'
  Escribir-Detalle "Abra http://localhost:$puertoApi o use el launcher."
  exit 0
} elseif ($apiLibre -and $pgListo -and $archivosOk) {
  Escribir-Aviso 'Estado general: sistema detenido, listo para iniciar.'
  Escribir-Detalle 'Use el launcher (Iniciar Ferretería) o ejecute: npm.cmd run iniciar'
  exit 1
} else {
  Escribir-Err 'Estado general: requiere revisión.'
  Escribir-Detalle 'Revise el detalle anterior. No se detuvo, inició ni modificó nada.'
  exit 2
}
