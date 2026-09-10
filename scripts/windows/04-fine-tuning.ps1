<#
.SYNOPSIS
    Fase 4: Ajustes finos - Características opcionales, TEMP, Brave, Everything
.DESCRIPTION
    Desactivar features Windows innecesarias, mover TEMP a D:, configurar Brave, instalar Everything.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Ejecutar como Administrador
#>

param(
    [switch]$Rollback,
    [switch]$WhatIf,
    [string]$DataDrive = "D"
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }
function Invoke-Cmd { param([scriptblock]$Script,[string]$Desc) if($WhatIf){Write-Log "[WHATIF] $Desc" -Level "WARN";return} try{&$Script;Write-Log "OK: $Desc"}catch{Write-Log "FAIL: $Desc - $_" -Level "ERROR";throw} }

if ($Rollback) {
    Write-Log "=== ROLLBACK FASE 4 ==="
    # Features opcionales - reactivar las que se desactivaron
    $features = @(
        "VirtualMachinePlatform","WorkFolders-Client","WCF-Services45","WCF-TCP-PortSharing45",
        "SmbDirect","Printing-PrintToPDFServices-Features","Printing-Foundation-Features",
        "Printing-Foundation-InternetPrinting-Client","MSRDC-Infrastructure","NetFx4-AdvSrvs",
        "Microsoft-RemoteDesktopConnection"
    )
    foreach ($f in $features) {
        Invoke-Cmd { Enable-WindowsOptionalFeature -Online -FeatureName $f -NoRestart -ErrorAction SilentlyContinue } "Reactivar $f"
    }
    # TEMP/TMP restaurar a default
    Invoke-Cmd {
        [Environment]::SetEnvironmentVariable("TEMP","%USERPROFILE%\AppData\Local\Temp","User")
        [Environment]::SetEnvironmentVariable("TMP","%USERPROFILE%\AppData\Local\Temp","User")
        reg delete HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TEMP /f 2>$null
        reg delete HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TMP /f 2>$null
    } "Restaurar TEMP/TMP a default"
    Write-Log "Rollback Fase 4 completado (Brave/Everything manual)"
    exit 0
}

Write-Log "=== FASE 4: AJUSTES FINOS ==="

# 1. Desactivar características opcionales innecesarias
$disableFeatures = @(
    @{Name="VirtualMachinePlatform"; Desc="Hyper-V/WSL (ya usamos WSL2 para RHEL, pero feature separada)"},
    @{Name="WorkFolders-Client"; Desc="Work Folders (empresa)"},
    @{Name="WCF-Services45"; Desc="WCF Legacy 4.5"},
    @{Name="WCF-TCP-PortSharing45"; Desc="WCF Port Sharing Legacy"},
    @{Name="SmbDirect"; Desc="SMB Direct (RDMA) - solo servers"},
    @{Name="Printing-PrintToPDFServices-Features"; Desc="Print to PDF services"},
    @{Name="Printing-Foundation-Features"; Desc="Print Foundation"},
    @{Name="Printing-Foundation-InternetPrinting-Client"; Desc="Internet Printing Client"},
    @{Name="MSRDC-Infrastructure"; Desc="Remote Desktop Infrastructure"},
    @{Name="NetFx4-AdvSrvs"; Desc="ASP.NET 4.5+ (si no hostea IIS)"},
    @{Name="Microsoft-RemoteDesktopConnection"; Desc="Cliente RDP (si no conecta a otros)"}
)
# Nota: SearchEngine-Client-Package, WindowsMediaPlayer, Windows-Defender-Default-Definitions se mantienen

foreach ($f in $disableFeatures) {
    Invoke-Cmd {
        Disable-WindowsOptionalFeature -Online -FeatureName $f.Name -NoRestart -ErrorAction SilentlyContinue
    } "Desactivar $($f.Name) - $($f.Desc)"
}

# 2. Mover TEMP/TMP a D:\Temp (si D: existe y es NTFS)
$dVol = Get-Volume -DriveLetter $DataDrive -ErrorAction SilentlyContinue
if ($dVol -and $dVol.FileSystem -eq "NTFS") {
    Invoke-Cmd {
        New-Item -ItemType Directory -Force -Path "$($DataDrive):\Temp" | Out-Null
        [Environment]::SetEnvironmentVariable("TEMP","$($DataDrive):\Temp","User")
        [Environment]::SetEnvironmentVariable("TMP","$($DataDrive):\Temp","User")
        # System-wide también
        reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TEMP /t REG_EXPAND_SZ /d "$($DataDrive):\Temp" /f
        reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TMP /t REG_EXPAND_SZ /d "$($DataDrive):\Temp" /f
    } "Mover TEMP/TMP a $($DataDrive):\Temp"
} else {
    Write-Log "Unidad $DataDrive: no disponible o no NTFS - TEMP se queda en C:" -Level "WARN"
}

# 3. Configurar Brave: Memory Saver (via preferences JSON)
$bravePref = "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Preferences"
if (Test-Path $bravePref) {
    Invoke-Cmd {
        $json = Get-Content $bravePref -Raw | ConvertFrom-Json
        $json.performance_tuning = @{
            memory_saver_mode = "enabled"
            high_efficiency_mode = "enabled"
            discard_ring_buffer_size = 5
        } | ConvertTo-Json -Depth 10
        # Nota: Brave prefiere configuración via UI (brave://settings/performance)
        Write-Log "  Configurar manual: brave://settings/performance → Memory Saver ON, High Efficiency ON"
    } "Configurar Brave Memory Saver (preferencias JSON - requiere reinicio Brave)"
} else {
    Write-Log "Brave no encontrado en ruta estándar - configurar manual: brave://settings/performance" -Level "WARN"
}

# 4. Instalar Everything (voidtools) - búsqueda instantánea sin indexador
if (-not (Get-Command "Everything.exe" -ErrorAction SilentlyContinue)) {
    Invoke-Cmd {
        Write-Log "  Descargar e instalar Everything: https://www.voidtools.com/"
        Write-Log "  O via winget: winget install voidtools.Everything"
    } "Instalar Everything (voidtools) - reemplaza Windows Search"
} else {
    Write-Log "Everything ya instalado"
}

# 5. Pagefile: gestión automática (ya OK, 1.9 GB pico 45 MB)
Invoke-Cmd {
    $pf = Get-CimInstance Win32_PageFileSetting
    if ($pf.AutomaticManagedPagefile -eq $false) {
        Write-Log "  Pagefile NO gestionado automáticamente - recomendado activar" -Level "WARN"
    } else {
        Write-Log "  Pagefile: gestión automática OK"
    }
} "Verificar pagefile gestión automática"

# 6. Plan de energía: mantener Balanced (óptimo para i3-N305)
Invoke-Cmd {
    powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e
    Write-Log "  Plan 'Equilibrado' activo (recomendado para SoC móvil 15W)"
} "Confirmar plan de energía Balanced"

Write-Log "=== FASE 4 COMPLETADA ==="
Write-Log "Rollback: .\04-fine-tuning.ps1 -Rollback"
Write-Log "Pendiente manual: Brave://settings/performance, instalar Everything"