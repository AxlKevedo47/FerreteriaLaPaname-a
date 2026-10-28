# Restauración manual y explícita de un respaldo.
# No se ejecuta desde la interfaz para evitar sobrescrituras accidentales.
#
# Uso recomendado: restaurar primero en una base de prueba.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restaurar.ps1 `
#     -Archivo backups\ferreteria_20261027_160000.dump -BaseDestino ferreteria_restauracion
param(
  [Parameter(Mandatory = $true)]
  [string]$Archivo,
  [string]$BaseDestino = 'ferreteria_restauracion',
  [switch]$Confirmar
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

function Leer-Env([string]$ruta) {
  $mapa = @{}
  if (-not (Test-Path $ruta)) { return $mapa }
  Get-Content $ruta | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $mapa[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $mapa
}

$configuracion = Leer-Env (Join-Path $raiz '.env')
$pgRestore = if ($configuracion.PG_RESTORE_PATH) { $configuracion.PG_RESTORE_PATH } else { 'pg_restore' }
$hostDb = if ($configuracion.DB_HOST) { $configuracion.DB_HOST } else { '127.0.0.1' }
$puertoDb = if ($configuracion.DB_PORT) { $configuracion.DB_PORT } else { '5432' }
$usuarioDb = $configuracion.DB_USER
$baseEnUso = $configuracion.DB_NAME

$rutaArchivo = if ([System.IO.Path]::IsPathRooted($Archivo)) { $Archivo } else { Join-Path $raiz $Archivo }
if (-not (Test-Path $rutaArchivo)) { throw "No existe el archivo $rutaArchivo." }
if (-not $BaseDestino) { throw 'Debe indicar una base de destino.' }

if ($BaseDestino -eq $baseEnUso -and -not $Confirmar) {
  throw 'La base de destino es la base en uso. Repita el comando con -Confirmar solo si ya generó un respaldo de seguridad.'
}

if (-not $Confirmar) {
  Write-Host "Se restaurará '$rutaArchivo' sobre la base '$BaseDestino'." -ForegroundColor Yellow
  Write-Host 'Los objetos existentes en esa base serán reemplazados (--clean --if-exists).'
  $respuesta = Read-Host "Escriba RESTAURAR para continuar"
  if ($respuesta -ne 'RESTAURAR') {
    Write-Host 'Restauración cancelada.'
    exit 1
  }
}

$env:PGPASSWORD = $configuracion.DB_PASSWORD
try {
  Write-Host "Restaurando en $BaseDestino..."
  & $pgRestore --host $hostDb --port $puertoDb --username $usuarioDb --dbname $BaseDestino --clean --if-exists --no-owner --no-privileges $rutaArchivo
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore reportó errores. Revise la salida anterior.' }
  Write-Host 'Restauración completada.'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
