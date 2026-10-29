# Apagado acotado del launcher. No busca procesos por puerto o nombre: solo
# finaliza el árbol cuyo proceso raíz fue registrado al iniciar Ferretería.
# PostgreSQL se detiene únicamente mediante pg_ctl sobre .local/pgdata.

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$manifest = Join-Path $raiz '.local\launcher-iniciar.json'

function Info([string]$texto) { Write-Host "[apagar] $texto" -ForegroundColor Cyan }
function Ok([string]$texto) { Write-Host "[apagar] OK: $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "[apagar] AVISO: $texto" -ForegroundColor Yellow }

function Obtener-Descendientes([int]$pidRaiz) {
  $todos = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  $pendientes = @($pidRaiz)
  $resultado = @()
  while ($pendientes.Count -gt 0) {
    $padre = $pendientes[0]
    $pendientes = @($pendientes | Select-Object -Skip 1)
    $hijos = @($todos | Where-Object { [int]$_.ParentProcessId -eq $padre })
    foreach ($hijo in $hijos) {
      $resultado += [int]$hijo.ProcessId
      $pendientes += [int]$hijo.ProcessId
    }
  }
  return $resultado
}

function Obtener-PgCtlLocal([string]$datos) {
  $candidatos = @()
  if ($env:PG_BIN) { $candidatos += $env:PG_BIN }
  $comando = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
  if ($comando) { $candidatos += (Split-Path -Parent $comando.Source) }
  foreach ($version in @('18', '17', '16', '15', '14')) {
    $candidatos += "C:\Program Files\PostgreSQL\$version\bin"
  }
  foreach ($carpeta in $candidatos) {
    $pgCtl = Join-Path $carpeta 'pg_ctl.exe'
    if (Test-Path $pgCtl) { return $pgCtl }
  }
  return $null
}

if (Test-Path $manifest) {
  try {
    $registro = Get-Content $manifest -Raw | ConvertFrom-Json
    $pidRaiz = [int]$registro.pid
    $proceso = Get-Process -Id $pidRaiz -ErrorAction SilentlyContinue
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $pidRaiz" -ErrorAction SilentlyContinue
    $inicioEsperado = [datetime]::Parse($registro.inicioUtc).ToUniversalTime()
    $inicioReal = $proceso.StartTime.ToUniversalTime()
    $esMismoProceso = $proceso -and $cim -and
      ([math]::Abs(($inicioReal - $inicioEsperado).TotalSeconds) -lt 2) -and
      $cim.CommandLine -and $cim.CommandLine.Contains([string]$registro.script)

    if ($esMismoProceso) {
      $descendientes = @(Obtener-Descendientes $pidRaiz)
      foreach ($pid in ($descendientes | Sort-Object -Descending)) {
        Stop-Process -Id $pid -ErrorAction SilentlyContinue
      }
      Stop-Process -Id $pidRaiz -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 800
      $restantes = @($descendientes + $pidRaiz | Where-Object {
        Get-Process -Id $_ -ErrorAction SilentlyContinue
      })
      if ($restantes.Count -eq 0) {
        Ok 'El árbol de procesos registrado por el launcher se detuvo correctamente.'
      } else {
        Aviso "Algunos procesos registrados siguen activos ($($restantes -join ', ')); no se intentó terminar otros procesos."
      }
    } else {
      Aviso 'El proceso registrado ya no existe o no coincide con el manifiesto; no se terminó ningún proceso.'
    }
  } catch {
    Aviso "No se pudo validar el manifiesto de arranque: $($_.Exception.Message). No se terminó ningún proceso."
  } finally {
    Remove-Item $manifest -Force -ErrorAction SilentlyContinue
  }
} else {
  Info 'No hay procesos de arranque registrados por el launcher.'
}

$datosPg = Join-Path $raiz '.local\pgdata'
if (Test-Path (Join-Path $datosPg 'PG_VERSION')) {
  $scriptDb = Join-Path $raiz 'scripts\local-db.ps1'
  $pgCtl = Obtener-PgCtlLocal $datosPg
  try {
    if (-not $pgCtl) {
      Aviso 'No se encontró pg_ctl para verificar el clúster local; no se detuvo PostgreSQL.'
      exit 0
    }
    & $pgCtl -D $datosPg status *> $null
    if ($LASTEXITCODE -eq 0) {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptDb detener
      if ($LASTEXITCODE -eq 0) {
        & $pgCtl -D $datosPg status *> $null
        if ($LASTEXITCODE -ne 0) { Ok 'El clúster local del proyecto se detuvo con pg_ctl.' }
        else { Aviso 'pg_ctl todavía detecta el clúster local; no se intentó detener ningún otro PostgreSQL.' }
      } else { Aviso 'No se pudo detener el clúster local; no se intentó detener ningún otro PostgreSQL.' }
    } else {
      Info 'El clúster local del proyecto no está activo; no se detuvo PostgreSQL.'
    }
  } catch {
    Aviso 'No se pudo confirmar el clúster local; no se detuvo PostgreSQL.'
  }
} else {
  Info 'No existe un clúster local del proyecto; no se detuvo PostgreSQL.'
}
