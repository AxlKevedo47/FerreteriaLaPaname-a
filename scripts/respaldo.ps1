# Respaldo manual desde la línea de comandos (alternativa a la interfaz).
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/respaldo.ps1
param(
  [string]$Destino = ''
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

function Buscar-PgDump {
  if ($env:PG_DUMP_PATH) { return $env:PG_DUMP_PATH }
  $candidatos = @()
  $comando = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
  if ($comando) { $candidatos += $comando.Source }
  foreach ($version in @('18', '17', '16', '15', '14')) {
    $candidatos += "C:\Program Files\PostgreSQL\$version\bin\pg_dump.exe"
  }
  foreach ($candidato in $candidatos) {
    if (Test-Path $candidato) { return $candidato }
  }
  throw 'No se encontró pg_dump.exe. Defina PG_DUMP_PATH en .env.'
}

$configuracion = Leer-Env (Join-Path $raiz '.env')
if (-not $configuracion.DB_NAME -or -not $configuracion.DB_USER -or -not $configuracion.DB_PASSWORD) {
  throw 'Faltan DB_NAME, DB_USER o DB_PASSWORD en .env.'
}

$pgDump = if ($configuracion.PG_DUMP_PATH) { $configuracion.PG_DUMP_PATH } else { Buscar-PgDump }
$hostDb = if ($configuracion.DB_HOST) { $configuracion.DB_HOST } else { '127.0.0.1' }
$puertoDb = if ($configuracion.DB_PORT) { $configuracion.DB_PORT } else { '5432' }
$directorioRespaldos = if ($Destino) { $Destino } elseif ($configuracion.RESPALDO_DIR) { Join-Path $raiz $configuracion.RESPALDO_DIR } else { Join-Path $raiz 'backups' }

New-Item -ItemType Directory -Force -Path $directorioRespaldos | Out-Null
$marca = Get-Date -Format 'yyyyMMdd_HHmmss'
$archivo = Join-Path $directorioRespaldos "ferreteria_$marca.dump"

$env:PGPASSWORD = $configuracion.DB_PASSWORD
try {
  Write-Host "Generando respaldo en $archivo..."
  & $pgDump --host $hostDb --port $puertoDb --username $configuracion.DB_USER --dbname $configuracion.DB_NAME --format=custom --compress=6 --no-owner --no-privileges --file $archivo
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump falló.' }
  if (-not (Test-Path $archivo) -or (Get-Item $archivo).Length -eq 0) {
    throw 'El archivo de respaldo no se creó o está vacío.'
  }
  Write-Host "Respaldo creado: $archivo"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
