# Arranque desarrollo V1.1 - Ferretería La Panameña
# Coordina backend (node --watch) y Vite. NO crea bases, roles, tablas, esquemas, catálogos ni datos de demostración.
# Evita instancias duplicadas, solo finaliza procesos iniciados por este script al interrumpirlo.

$ErrorActionPreference = 'Stop'

function Escribir-Info($mensaje) { Write-Host "[iniciar:dev] $mensaje" -ForegroundColor Cyan }
function Escribir-Ok($mensaje)   { Write-Host "[iniciar:dev] OK: $mensaje" -ForegroundColor Green }
function Escribir-Err($mensaje)  { Write-Host "[iniciar:dev] ERROR: $mensaje" -ForegroundColor Red }
function Escribir-Ayuda($mensaje){ Write-Host "[iniciar:dev] $mensaje" -ForegroundColor Yellow }

$raiz = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $raiz '.local\iniciar-dev.pids.json'

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

function Puerto-EnUso([int]$puerto) {
  try {
    $c = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $c -and $c.Count -gt 0)
  } catch {
    return $false
  }
}

function Detener-Procesos-Iniciados {
  if (-not (Test-Path $pidFile)) { return }
  try {
    $datos = Get-Content $pidFile -Raw | ConvertFrom-Json
    foreach ($pid in $datos.pids) {
      if ($pid -and $pid -gt 0) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
          # Solo matar si sigue existiendo; no matar por nombre
          try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch { }
        }
      }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Escribir-Info "Procesos iniciados por este script detenidos."
  } catch {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
}

# Registrar limpieza al salir
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Detener-Procesos-Iniciados } | Out-Null
try {
  # 1) .env
  $envPath = Join-Path $raiz '.env'
  if (-not (Test-Path $envPath)) {
    Escribir-Err ".env no existe"
    Escribir-Ayuda "Copie .env.example a .env y complete los valores."
    exit 1
  }
  $config = Leer-Env $envPath
  $requeridas = @('DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','PORT')
  foreach ($r in $requeridas) {
    if (-not $config.ContainsKey($r) -or [string]::IsNullOrWhiteSpace($config[$r])) {
      Escribir-Err "Falta variable requerida en .env: $r"
      Escribir-Ayuda "Revise .env.example. No se mostrarán valores sensibles."
      exit 1
    }
  }
  Escribir-Ok "Variables .env validadas"

  # 2) Dependencias
  if (-not (Test-Path (Join-Path $raiz 'backend\node_modules'))) {
    Escribir-Err "Faltan dependencias de backend"
    Escribir-Ayuda "Ejecute: npm run instalar"
    exit 1
  }
  if (-not (Test-Path (Join-Path $raiz 'frontend\node_modules'))) {
    Escribir-Err "Faltan dependencias de frontend"
    Escribir-Ayuda "Ejecute: npm run instalar"
    exit 1
  }
  Escribir-Ok "Dependencias presentes"

  # 3) Puertos
  $puertoApi = [int]$config['PORT']
  $puertoVite = 5173
  if (Puerto-EnUso $puertoApi) {
    Escribir-Err "Puerto $puertoApi ya está en uso"
    Escribir-Ayuda "No se finalizan procesos ajenos. Deténgalo manualmente o cambie PORT."
    exit 1
  }
  if (Puerto-EnUso $puertoVite) {
    Escribir-Err "Puerto $puertoVite ya está en uso"
    Escribir-Ayuda "No se finalizan procesos ajenos. Detenga Vite/manual o use otro puerto."
    exit 1
  }
  Escribir-Ok "Puertos $puertoApi y $puertoVite libres"

  # 4) Limpiar PID file previo
  New-Item -ItemType Directory -Force -Path (Join-Path $raiz '.local') | Out-Null
  if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }

  $pids = @()

  # 5) Iniciar backend en dev (solo procesos iniciados aquí)
  Escribir-Info "Iniciando backend en modo desarrollo..."
  $procBackend = Start-Process -FilePath "npm.cmd" -ArgumentList "--prefix", "backend", "run", "dev" -WorkingDirectory $raiz -PassThru -WindowStyle Normal
  $pids += $procBackend.Id
  Start-Sleep -Seconds 2

  # 6) Iniciar frontend Vite
  Escribir-Info "Iniciando frontend Vite (dev)..."
  $procFrontend = Start-Process -FilePath "npm.cmd" -ArgumentList "--prefix", "frontend", "run", "dev" -WorkingDirectory $raiz -PassThru -WindowStyle Normal
  $pids += $procFrontend.Id
  Start-Sleep -Seconds 3

  # Guardar PIDs
  @{ pids = $pids; inicio = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content $pidFile -Encoding UTF8

  Escribir-Ok "Backend y frontend iniciados (solo procesos de esta ejecución)"
  Escribir-Info "Presione Ctrl+C para detener ambos. No se finalizarán procesos ajenos."
  Escribir-Info "Backend: http://localhost:$puertoApi | Frontend: http://localhost:$puertoVite"

  # Mantener vivo hasta interrupción
  try {
    while ($true) {
      Start-Sleep -Seconds 1
      # Si algún proceso murió inesperadamente, seguir mostrando pero no matar ajenos
    }
  } finally {
    Detener-Procesos-Iniciados
  }
} catch {
  Escribir-Err $_.Exception.Message
  Detener-Procesos-Iniciados
  exit 1
}
