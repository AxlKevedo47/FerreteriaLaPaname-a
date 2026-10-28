# Aplica el esquema y los catálogos iniciales sobre la base configurada en .env.
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aplicar-esquema.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aplicar-esquema.ps1 -Demo
param(
  [switch]$Demo
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

function Buscar-Psql {
  $candidatos = @()
  if ($env:PG_BIN) { $candidatos += $env:PG_BIN }
  $comando = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($comando) { $candidatos += (Split-Path -Parent $comando.Source) }
  foreach ($version in @('18', '17', '16', '15', '14')) {
    $candidatos += "C:\Program Files\PostgreSQL\$version\bin"
  }
  foreach ($candidato in $candidatos) {
    if (Test-Path (Join-Path $candidato 'psql.exe')) { return (Join-Path $candidato 'psql.exe') }
  }
  throw 'No se encontró psql.exe. Instale PostgreSQL o defina PG_BIN.'
}

$configuracion = Leer-Env (Join-Path $raiz '.env')
if (-not $configuracion.DB_NAME -or -not $configuracion.DB_USER -or -not $configuracion.DB_PASSWORD) {
  throw 'Faltan DB_NAME, DB_USER o DB_PASSWORD en .env.'
}

$psql = Buscar-Psql
$hostDb = if ($configuracion.DB_HOST) { $configuracion.DB_HOST } else { '127.0.0.1' }
$puertoDb = if ($configuracion.DB_PORT) { $configuracion.DB_PORT } else { '5432' }
$env:PGPASSWORD = $configuracion.DB_PASSWORD

try {
  Write-Host "Aplicando esquema en $($configuracion.DB_NAME) ($hostDb`:$puertoDb)..."
  & $psql -h $hostDb -p $puertoDb -U $configuracion.DB_USER -d $configuracion.DB_NAME -v ON_ERROR_STOP=1 -f (Join-Path $raiz 'database\schema.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la aplicación del esquema.' }

  Write-Host 'Cargando categorías y unidades iniciales...'
  & $psql -h $hostDb -p $puertoDb -U $configuracion.DB_USER -d $configuracion.DB_NAME -v ON_ERROR_STOP=1 -f (Join-Path $raiz 'database\seed-catalogos.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la carga de catálogos iniciales.' }

  if ($Demo) {
    Write-Host 'Cargando datos de demostración [DEMO]...'
    & $psql -h $hostDb -p $puertoDb -U $configuracion.DB_USER -d $configuracion.DB_NAME -v ON_ERROR_STOP=1 -f (Join-Path $raiz 'database\seed-demo.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Falló la carga de datos de demostración.' }
  }

  Write-Host 'Esquema aplicado correctamente.'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
