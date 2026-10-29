# Launcher gráfico - Ferretería La Panameña
# Usa los scripts existentes para diagnóstico, arranque y apagado acotado.
# Nunca libera puertos ni finaliza procesos que no hayan quedado registrados
# como iniciados por este launcher.
#
# Uso normal:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/launcher.ps1
# o doble clic en Abrir-Ferreteria.cmd

param(
  [switch]$SoloFunciones
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$scriptEstado = Join-Path $raiz 'scripts\estado.ps1'
$scriptIniciar = Join-Path $raiz 'scripts\iniciar.ps1'
$scriptApagar = Join-Path $raiz 'scripts\apagar.ps1'
$script:urlApp = 'http://localhost:4000'
$script:iniciando = $false
$script:horaInicio = $null
$script:procesoPostgres = $null

function Agregar-Log {
  param([string]$Texto)
  if (-not $script:txtLog) { return }
  $linea = '[{0:HH:mm:ss}] {1}' -f (Get-Date), $Texto
  $script:txtLog.AppendText($linea + "`r`n")
  $script:txtLog.SelectionStart = $script:txtLog.TextLength
  $script:txtLog.ScrollToCaret()
  [System.Windows.Forms.Application]::DoEvents()
}

function Set-EstadoVisual {
  param(
    [string]$Texto,
    [System.Drawing.Color]$Fondo,
    [System.Drawing.Color]$Letra
  )
  if (-not $script:lblEstado) { return }
  $script:lblEstado.Text = $Texto
  $script:lblEstado.BackColor = $Fondo
  $script:lblEstado.ForeColor = $Letra
  $script:lblEstado.Refresh()
  [System.Windows.Forms.Application]::DoEvents()
}

function Invoke-Diagnostico {
  $salida = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptEstado 2>&1
  $codigo = $LASTEXITCODE
  return [pscustomobject]@{
    Codigo = $codigo
    Salida = (($salida | Out-String).Trim())
  }
}

function Programar-ActualizacionEstado {
  param([int]$Milisegundos = 4000)
  $temporizador = New-Object System.Windows.Forms.Timer
  $temporizador.Interval = $Milisegundos
  $temporizador.Add_Tick({
    param($sender, $evento)
    $sender.Stop()
    $sender.Dispose()
    Actualizar-Estado
  })
  $temporizador.Start()
}

function Actualizar-Estado {
  try {
    Set-EstadoVisual 'Consultando estado...' ([System.Drawing.Color]::FromArgb(238, 238, 238)) ([System.Drawing.Color]::Black)
    if ($script:form) { $script:form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor }
    $resultado = Invoke-Diagnostico

    switch ($resultado.Codigo) {
      0 {
        Set-EstadoVisual 'Sistema en ejecución (API y PostgreSQL disponibles)' ([System.Drawing.Color]::FromArgb(0, 121, 107)) ([System.Drawing.Color]::White)
      }
      1 {
        Set-EstadoVisual 'Sistema detenido. Listo para iniciar.' ([System.Drawing.Color]::FromArgb(255, 193, 7)) ([System.Drawing.Color]::Black)
      }
      default {
        Set-EstadoVisual 'Requiere revisión. Consulte el registro.' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
      }
    }

    Agregar-Log $resultado.Salida
    Agregar-Log "Código de diagnóstico: $($resultado.Codigo)"
    if ($resultado.Codigo -eq 0) {
      $script:iniciando = $false
      $script:horaInicio = $null
    }
  } catch {
    Set-EstadoVisual 'Error al consultar el estado' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
    Agregar-Log "Error al consultar el estado: $($_.Exception.Message)"
  } finally {
    if ($script:form) { $script:form.Cursor = [System.Windows.Forms.Cursors]::Default }
  }
}

function Iniciar-Sistema {
  try {
    if ($script:iniciando) {
      $transcurrido = if ($script:horaInicio) { ((Get-Date) - $script:horaInicio).TotalSeconds } else { 0 }
      if ($transcurrido -lt 90) {
        Agregar-Log 'Ya hay un arranque en curso. Espere y use Consultar estado.'
        return
      }
      $script:iniciando = $false
      $script:horaInicio = $null
    }

    Set-EstadoVisual 'Comprobando estado antes de iniciar...' ([System.Drawing.Color]::FromArgb(238, 238, 238)) ([System.Drawing.Color]::Black)
    $resultado = Invoke-Diagnostico

    if ($resultado.Codigo -eq 0) {
      Agregar-Log 'El sistema ya está en ejecución. No se inició otra instancia.'
      Set-EstadoVisual 'Sistema en ejecución (API y PostgreSQL disponibles)' ([System.Drawing.Color]::FromArgb(0, 121, 107)) ([System.Drawing.Color]::White)
      [System.Windows.Forms.MessageBox]::Show(
        'Ferretería La Panameña ya está en ejecución.' + "`r`n`r`n" + $script:urlApp,
        'Ferretería La Panameña',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
      return
    }

    if ($resultado.Codigo -ne 1) {
      Agregar-Log 'No se inicia: el estado requiere revisión.'
      Agregar-Log $resultado.Salida
      Set-EstadoVisual 'Requiere revisión. No se inició nada.' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
      [System.Windows.Forms.MessageBox]::Show(
        'No se inició el sistema porque el estado requiere revisión.' + "`r`n`r`n" +
        'Puede haber un servicio no identificado en el puerto 4000 o PostgreSQL no está disponible.' + "`r`n" +
        'El launcher no finaliza procesos no identificados ni libera puertos. Consulte el registro y el diagnóstico.',
        'Ferretería La Panameña',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      return
    }

    New-Item -ItemType Directory -Force -Path (Join-Path $raiz '.local') | Out-Null
    $marca = Get-Date -Format 'yyyyMMdd_HHmmss'
    $salidaLog = Join-Path $raiz ".local\launcher-iniciar-$marca.out.log"
    $errorLog = Join-Path $raiz ".local\launcher-iniciar-$marca.err.log"

    Agregar-Log 'Iniciando Ferretería con el mecanismo existente (scripts/iniciar.ps1)...'
    $script:iniciando = $true
    $script:horaInicio = Get-Date
    $procesoArranque = Start-Process -FilePath 'powershell.exe' `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptIniciar`"") `
      -WorkingDirectory $raiz `
      -WindowStyle Hidden `
      -RedirectStandardOutput $salidaLog `
      -RedirectStandardError $errorLog `
      -PassThru

    # El manifiesto permite apagar exclusivamente el árbol creado por este
    # launcher; no se infieren PIDs a partir del puerto ni del nombre del proceso.
    $inicioProceso = $procesoArranque.StartTime.ToUniversalTime().ToString('o')
    @{
      pid = $procesoArranque.Id
      inicioUtc = $inicioProceso
      script = $scriptIniciar
    } | ConvertTo-Json | Set-Content (Join-Path $raiz '.local\launcher-iniciar.json') -Encoding UTF8

    Set-EstadoVisual 'Iniciando... pulse Consultar estado en unos segundos.' ([System.Drawing.Color]::FromArgb(255, 193, 7)) ([System.Drawing.Color]::Black)
    Agregar-Log 'Arranque lanzado en segundo plano. Use Consultar estado para confirmar.'
    Programar-ActualizacionEstado
  } catch {
    $script:iniciando = $false
    $script:horaInicio = $null
    Set-EstadoVisual 'Error al iniciar' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
    Agregar-Log "Error al iniciar: $($_.Exception.Message)"
  }
}

function Iniciar-PostgreSQLLocal {
  try {
    if ($script:procesoPostgres -and -not $script:procesoPostgres.HasExited) {
      Agregar-Log 'Ya hay un inicio de PostgreSQL local en curso. Espere y use Consultar estado.'
      return
    }

    $activo = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($activo) {
      Agregar-Log 'PostgreSQL ya está activo en 127.0.0.1:5433. No se inició otra instancia.'
      Set-EstadoVisual 'PostgreSQL local ya está activo.' ([System.Drawing.Color]::FromArgb(0, 121, 107)) ([System.Drawing.Color]::White)
      return
    }

    New-Item -ItemType Directory -Force -Path (Join-Path $raiz '.local') | Out-Null
    $marca = Get-Date -Format 'yyyyMMdd_HHmmss'
    $salidaLog = Join-Path $raiz ".local\launcher-postgres-$marca.out.log"
    $errorLog = Join-Path $raiz ".local\launcher-postgres-$marca.err.log"
    Agregar-Log 'Iniciando PostgreSQL local con npm.cmd run db:local:iniciar...'
    $script:procesoPostgres = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'db:local:iniciar' -WorkingDirectory $raiz -WindowStyle Hidden `
      -RedirectStandardOutput $salidaLog -RedirectStandardError $errorLog -PassThru
    Set-EstadoVisual 'Iniciando PostgreSQL local... consulte el estado en unos segundos.' ([System.Drawing.Color]::FromArgb(255, 193, 7)) ([System.Drawing.Color]::Black)
    Programar-ActualizacionEstado -Milisegundos 5000
  } catch {
    Set-EstadoVisual 'Error al iniciar PostgreSQL local' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
    Agregar-Log "Error al iniciar PostgreSQL local: $($_.Exception.Message)"
  }
}

function Apagar-Todo {
  try {
    Set-EstadoVisual 'Apagando procesos identificados del proyecto...' ([System.Drawing.Color]::FromArgb(238, 238, 238)) ([System.Drawing.Color]::Black)
    $salida = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptApagar 2>&1
    Agregar-Log (($salida | Out-String).Trim())
    Actualizar-Estado
  } catch {
    Set-EstadoVisual 'Error al apagar' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
    Agregar-Log "Error al apagar: $($_.Exception.Message)"
  }
}

function Abrir-Aplicacion {
  try {
    Set-EstadoVisual 'Comprobando la API antes de abrir...' ([System.Drawing.Color]::FromArgb(238, 238, 238)) ([System.Drawing.Color]::Black)
    $resultado = Invoke-Diagnostico

    if ($resultado.Codigo -eq 0) {
      Start-Process $script:urlApp
      Agregar-Log "Abriendo $($script:urlApp) en el navegador."
      Set-EstadoVisual 'Sistema en ejecución (API y PostgreSQL disponibles)' ([System.Drawing.Color]::FromArgb(0, 121, 107)) ([System.Drawing.Color]::White)
    } else {
      Agregar-Log 'No se abre el navegador: la API no está saludable.'
      Agregar-Log $resultado.Salida
      Set-EstadoVisual 'No se abrió la aplicación: API no saludable' ([System.Drawing.Color]::FromArgb(255, 193, 7)) ([System.Drawing.Color]::Black)
      [System.Windows.Forms.MessageBox]::Show(
        'La API no está saludable en este momento.' + "`r`n`r`n" +
        'Consulte el estado o inicie el sistema desde el launcher. ' +
        'Este botón no inicia el backend automáticamente.',
        'Ferretería La Panameña',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
    }
  } catch {
    Set-EstadoVisual 'Error al abrir la aplicación' ([System.Drawing.Color]::FromArgb(198, 40, 40)) ([System.Drawing.Color]::White)
    Agregar-Log "Error al abrir la aplicación: $($_.Exception.Message)"
  }
}

function New-VentanaLauncher {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'Ferretería La Panameña'
  $form.Size = New-Object System.Drawing.Size(680, 710)
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
  $form.MaximizeBox = $false
  $form.MinimizeBox = $true
  $form.Font = New-Object System.Drawing.Font('Segoe UI', 9)
  $form.BackColor = [System.Drawing.Color]::FromArgb(247, 251, 250)

  $cabecera = New-Object System.Windows.Forms.Panel
  $cabecera.Location = New-Object System.Drawing.Point(0, 0)
  $cabecera.Size = New-Object System.Drawing.Size(664, 72)
  $cabecera.BackColor = [System.Drawing.Color]::FromArgb(11, 63, 58)
  $form.Controls.Add($cabecera)

  $titulo = New-Object System.Windows.Forms.Label
  $titulo.Text = 'Ferretería La Panameña'
  $titulo.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
  $titulo.ForeColor = [System.Drawing.Color]::White
  $titulo.Location = New-Object System.Drawing.Point(20, 10)
  $titulo.Size = New-Object System.Drawing.Size(620, 32)
  $cabecera.Controls.Add($titulo)

  $subtitulo = New-Object System.Windows.Forms.Label
  $subtitulo.Text = 'Catálogo local de productos · Launcher'
  $subtitulo.ForeColor = [System.Drawing.Color]::FromArgb(196, 240, 234)
  $subtitulo.Location = New-Object System.Drawing.Point(22, 43)
  $subtitulo.Size = New-Object System.Drawing.Size(620, 20)
  $cabecera.Controls.Add($subtitulo)

  $lblEstado = New-Object System.Windows.Forms.Label
  $lblEstado.Text = 'Consultando estado...'
  $lblEstado.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
  $lblEstado.Padding = New-Object System.Windows.Forms.Padding(10, 0, 10, 0)
  $lblEstado.Location = New-Object System.Drawing.Point(20, 88)
  $lblEstado.Size = New-Object System.Drawing.Size(620, 42)
  $lblEstado.BackColor = [System.Drawing.Color]::White
  $lblEstado.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
  $form.Controls.Add($lblEstado)

  $btnPostgres = New-Object System.Windows.Forms.Button
  $btnPostgres.Text = 'Iniciar PostgreSQL local'
  $btnPostgres.Location = New-Object System.Drawing.Point(20, 145)
  $btnPostgres.Size = New-Object System.Drawing.Size(620, 42)
  $btnPostgres.BackColor = [System.Drawing.Color]::FromArgb(230, 250, 246)
  $btnPostgres.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnPostgres.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(138, 223, 212)
  $form.Controls.Add($btnPostgres)

  $btnEstado = New-Object System.Windows.Forms.Button
  $btnEstado.Text = 'Consultar estado'
  $btnEstado.Location = New-Object System.Drawing.Point(20, 194)
  $btnEstado.Size = New-Object System.Drawing.Size(620, 42)
  $btnEstado.BackColor = [System.Drawing.Color]::White
  $btnEstado.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnEstado.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(196, 240, 234)
  $form.Controls.Add($btnEstado)

  $btnIniciar = New-Object System.Windows.Forms.Button
  $btnIniciar.Text = 'Iniciar Ferretería'
  $btnIniciar.Location = New-Object System.Drawing.Point(20, 243)
  $btnIniciar.Size = New-Object System.Drawing.Size(620, 44)
  $btnIniciar.BackColor = [System.Drawing.Color]::FromArgb(17, 122, 111)
  $btnIniciar.ForeColor = [System.Drawing.Color]::White
  $btnIniciar.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnIniciar.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(17, 122, 111)
  $form.Controls.Add($btnIniciar)

  $btnAbrir = New-Object System.Windows.Forms.Button
  $btnAbrir.Text = 'Abrir en la web'
  $btnAbrir.Location = New-Object System.Drawing.Point(20, 294)
  $btnAbrir.Size = New-Object System.Drawing.Size(620, 42)
  $btnAbrir.BackColor = [System.Drawing.Color]::White
  $btnAbrir.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnAbrir.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(196, 240, 234)
  $form.Controls.Add($btnAbrir)

  $btnApagar = New-Object System.Windows.Forms.Button
  $btnApagar.Text = 'Apagar todo'
  $btnApagar.Location = New-Object System.Drawing.Point(20, 343)
  $btnApagar.Size = New-Object System.Drawing.Size(620, 42)
  $btnApagar.BackColor = [System.Drawing.Color]::FromArgb(254, 243, 242)
  $btnApagar.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnApagar.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(198, 40, 40)
  $form.Controls.Add($btnApagar)

  $lblLog = New-Object System.Windows.Forms.Label
  $lblLog.Text = 'Registro'
  $lblLog.Location = New-Object System.Drawing.Point(20, 404)
  $lblLog.Size = New-Object System.Drawing.Size(100, 20)
  $lblLog.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
  $form.Controls.Add($lblLog)

  $txtLog = New-Object System.Windows.Forms.TextBox
  $txtLog.Multiline = $true
  $txtLog.ReadOnly = $true
  $txtLog.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
  $txtLog.Location = New-Object System.Drawing.Point(20, 428)
  $txtLog.Size = New-Object System.Drawing.Size(620, 185)
  $txtLog.Font = New-Object System.Drawing.Font('Consolas', 9)
  $txtLog.BackColor = [System.Drawing.Color]::White
  $form.Controls.Add($txtLog)

  $pie = New-Object System.Windows.Forms.Label
  $pie.Text = 'Apagar todo solo cierra el árbol iniciado por este launcher y el clúster local confirmado. No libera puertos ni termina procesos ajenos.'
  $pie.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
  $pie.Location = New-Object System.Drawing.Point(20, 627)
  $pie.Size = New-Object System.Drawing.Size(620, 42)
  $form.Controls.Add($pie)

  $script:form = $form
  $script:lblEstado = $lblEstado
  $script:txtLog = $txtLog

  $btnPostgres.Add_Click({ Iniciar-PostgreSQLLocal })
  $btnEstado.Add_Click({ Actualizar-Estado })
  $btnIniciar.Add_Click({ Iniciar-Sistema })
  $btnAbrir.Add_Click({ Abrir-Aplicacion })
  $btnApagar.Add_Click({ Apagar-Todo })

  return $form
}

if ($SoloFunciones) { return }

try {
  [System.Windows.Forms.Application]::EnableVisualStyles()
  $ventana = New-VentanaLauncher
  $ventana.Add_Shown({ Actualizar-Estado })
  [System.Windows.Forms.Application]::Run($ventana) | Out-Null
} catch {
  [System.Windows.Forms.MessageBox]::Show(
    "No se pudo iniciar el launcher: $($_.Exception.Message)",
    'Ferretería La Panameña',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}
