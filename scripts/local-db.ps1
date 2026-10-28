# Clúster PostgreSQL local opcional para desarrollo y verificación.
# No se usa en producción; el servicio PostgreSQL normal puede configurarse con .env.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 iniciar
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 detener
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 estado
param(
  [ValidateSet('iniciar', 'detener', 'estado', 'inicializar')]
  [string]$Accion = 'estado'
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$directorioLocal = Join-Path $raiz '.local'
$directorioDatos = if ($env:LOCAL_PGDATA) { $env:LOCAL_PGDATA } else { Join-Path $directorioLocal 'pgdata' }
$archivoLog = Join-Path $directorioLocal 'postgres.log'
$archivoPasswordSuperusuario = Join-Path $directorioLocal 'postgres-password.txt'
$puerto = if ($env:LOCAL_PG_PORT) { [int]$env:LOCAL_PG_PORT } else { 5433 }

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

function Buscar-BinPostgres {
  $candidatos = @()
  if ($env:PG_BIN) { $candidatos += $env:PG_BIN }
  $comando = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
  if ($comando) { $candidatos += (Split-Path -Parent $comando.Source) }
  foreach ($version in @('18', '17', '16', '15', '14')) {
    $candidatos += "C:\Program Files\PostgreSQL\$version\bin"
  }
  foreach ($candidato in $candidatos) {
    if (Test-Path (Join-Path $candidato 'pg_ctl.exe')) { return $candidato }
  }
  throw 'No se encontró PostgreSQL. Instálelo o defina PG_BIN con la carpeta bin.'
}

function Nueva-Password {
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 24
  $rng.GetBytes($bytes)
  return ([Convert]::ToBase64String($bytes)).Replace('+', 'A').Replace('/', 'B').Replace('=', '')
}

$bin = Buscar-BinPostgres
$pgCtl = Join-Path $bin 'pg_ctl.exe'
$initDb = Join-Path $bin 'initdb.exe'
$psql = Join-Path $bin 'psql.exe'
$createdb = Join-Path $bin 'createdb.exe'
$pgIsReady = Join-Path $bin 'pg_isready.exe'
$configuracion = Leer-Env (Join-Path $raiz '.env')

$dbUsuario = if ($configuracion.DB_USER) { $configuracion.DB_USER } else { 'ferreteria_app' }
$dbPassword = $configuracion.DB_PASSWORD
$dbNombre = if ($configuracion.DB_NAME) { $configuracion.DB_NAME } else { 'ferreteria' }
$dbPruebas = "$dbNombre`_test"

function Esperar-Base {
  for ($intento = 0; $intento -lt 30; $intento++) {
    & $pgIsReady -h 127.0.0.1 -p $puerto -q | Out-Null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Milliseconds 500
  }
  throw "PostgreSQL no respondió en el puerto $puerto."
}

function Inicializar-Cluster {
  New-Item -ItemType Directory -Force -Path $directorioLocal | Out-Null
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $directorioDatos) | Out-Null

  if (-not (Test-Path (Join-Path $directorioDatos 'PG_VERSION'))) {
    if (Test-Path $directorioDatos) {
      $contenido = Get-ChildItem -Force $directorioDatos -ErrorAction SilentlyContinue
      if ($contenido) { throw "La carpeta $directorioDatos no está vacía y no parece un clúster válido." }
    }
    if (-not (Test-Path $archivoPasswordSuperusuario)) {
      Set-Content -Path $archivoPasswordSuperusuario -Value (Nueva-Password) -Encoding UTF8 -NoNewline
    }
    $passwordSuperusuario = (Get-Content $archivoPasswordSuperusuario -Raw).Trim()
    $archivoTemporal = Join-Path $directorioLocal 'initdb-password.tmp'
    Set-Content -Path $archivoTemporal -Value $passwordSuperusuario -Encoding UTF8 -NoNewline

    Write-Host "Inicializando clúster PostgreSQL local en $directorioDatos..."
    & $initDb -D $directorioDatos -U postgres --pwfile=$archivoTemporal --auth=scram-sha-256 --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'initdb falló.' }
    Remove-Item $archivoTemporal -Force -ErrorAction SilentlyContinue

    Add-Content -Path (Join-Path $directorioDatos 'postgresql.conf') -Value @"

# Configuración agregada por scripts/local-db.ps1
port = $puerto
listen_addresses = '127.0.0.1'
"@
  }

  $passwordSuperusuario = (Get-Content $archivoPasswordSuperusuario -Raw).Trim()
  $env:PGPASSWORD = $passwordSuperusuario

  $estado = & $pgCtl -D $directorioDatos status 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Iniciando PostgreSQL local en el puerto $puerto..."
    & $pgCtl -D $directorioDatos -l $archivoLog -w -t 30 start | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar PostgreSQL. Revise $archivoLog" }
  }
  Esperar-Base

  if (-not $dbPassword) {
    throw 'Falta DB_PASSWORD en .env. Copie .env.example a .env y complete las credenciales.'
  }

  $existeRol = ((& $psql -h 127.0.0.1 -p $puerto -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$dbUsuario'") | Out-String).Trim()
  if ($existeRol -ne '1') {
    Write-Host "Creando rol de aplicación $dbUsuario..."
    $sqlRol = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$dbUsuario') THEN
    CREATE ROLE $dbUsuario LOGIN PASSWORD '$dbPassword';
  END IF;
END
`$`$;
"@
    & $psql -h 127.0.0.1 -p $puerto -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sqlRol | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el rol de aplicación.' }
  }

  foreach ($base in @($dbNombre, $dbPruebas)) {
    $existeBase = ((& $psql -h 127.0.0.1 -p $puerto -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$base'") | Out-String).Trim()
    if ($existeBase -ne '1') {
      Write-Host "Creando base de datos $base..."
      & $createdb -h 127.0.0.1 -p $puerto -U postgres -O $dbUsuario -E UTF8 $base
      if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base $base." }
    }
  }

  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Write-Host "Clúster local listo: 127.0.0.1:$puerto | base $dbNombre | usuario $dbUsuario"
}

switch ($Accion) {
  'inicializar' { Inicializar-Cluster }
  'iniciar' {
    Inicializar-Cluster
  }
  'detener' {
    if (Test-Path (Join-Path $directorioDatos 'PG_VERSION')) {
      & $pgCtl -D $directorioDatos -m fast -w stop
    } else {
      Write-Host 'No existe un clúster local en .local/pgdata.'
    }
  }
  'estado' {
    if (Test-Path (Join-Path $directorioDatos 'PG_VERSION')) {
      & $pgCtl -D $directorioDatos status
      & $pgIsReady -h 127.0.0.1 -p $puerto
    } else {
      Write-Host 'No existe un clúster local. Ejecute: npm run db:local:iniciar'
    }
  }
}
