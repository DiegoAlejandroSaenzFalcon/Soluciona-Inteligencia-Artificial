<#
.SYNOPSIS
    Fase 1: Seguridad base - Contraseña, políticas, NetBIOS, Spooler, Defender
.DESCRIPTION
    Endurece configuración base. NO desinstala OneDrive. NO usa WSL2.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Ejecutar como Administrador
#>

param(
    [switch]$Rollback,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }
function Invoke-Cmd { param([scriptblock]$Script,[string]$Desc) if($WhatIf){Write-Log "[WHATIF] $Desc" -Level "WARN";return} try{&$Script;Write-Log "OK: $Desc"}catch{Write-Log "FAIL: $Desc - $_" -Level "ERROR";throw} }

if ($Rollback) {
    Write-Log "=== ROLLBACK FASE 1 ==="
    Invoke-Cmd { net accounts /minpwlen:0 /maxpwage:42 /uniquepw:0 /lockoutthreshold:10 } "Restaurar políticas contraseña default"
    Invoke-Cmd { Set-Service Spooler -StartupType Automatic; Start-Service Spooler } "Restaurar Spooler"
    Invoke-Cmd { 
        Set-MpPreference -PUAProtection 2 -CloudBlockLevel 0 -DisableRemovableDriveScanning $true 
    } "Restaurar Defender defaults"
    Invoke-Cmd {
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($a in $adapters) {
            Set-NetIPv4Protocol -InterfaceIndex $a.InterfaceIndex -Dhcp NetbiosOverTcpipEnabled -ErrorAction SilentlyContinue
        }
    } "Restaurar NetBIOS default"
    Write-Log "Rollback Fase 1 completado"
    exit 0
}

Write-Log "=== FASE 1: SEGURIDAD BASE ==="

# 1. Contraseña admin (interactiva)
Write-Log "1/5: Establecer contraseña para 'Diego Saenz'"
if (-not $WhatIf) { net user "Diego Saenz" * }

# 2. Políticas contraseña
Invoke-Cmd {
    net accounts /minpwlen:12 /maxpwage:90 /uniquepw:12 /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30
} "Políticas: min 12 chars, max 90 días, historial 12, lockout 5/30min"

# 3. NetBIOS sobre TCP/IP desactivado
Invoke-Cmd {
    $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and $_.InterfaceDescription -notmatch "Virtual|Hyper-V|WSL"}
    foreach ($a in $adapters) {
        Set-NetIPv4Protocol -InterfaceIndex $a.InterfaceIndex -Dhcp NetbiosOverTcpipDisabled -ErrorAction Stop
        Write-Log "  NetBIOS OFF en: $($a.Name)"
    }
} "Desactivar NetBIOS sobre TCP/IP en adaptadores físicos"

# 4. Spooler -> Disabled (0 impresoras)
$printers = Get-Printer -ErrorAction SilentlyContinue
if ($printers.Count -eq 0) {
    Invoke-Cmd {
        Stop-Service Spooler -Force -ErrorAction SilentlyContinue
        Set-Service Spooler -StartupType Disabled
    } "Spooler Disabled (sin impresoras)"
} else {
    Write-Log "Impresoras: $($printers.Count) - Spooler se mantiene" -Level "WARN"
}

# 5. Defender endurecido
Invoke-Cmd {
    Set-MpPreference -PUAProtection 1 -CloudBlockLevel 1 -DisableRemovableDriveScanning $false -DisableCatchupQuickScan $true -MAPSReporting 2 -SubmitSamplesConsent 1
} "Defender: PUA=Block, CloudBlock=High, ScanUSB=On"

Write-Log "=== FASE 1 COMPLETADA ==="
Write-Log "Rollback: .\01-security-baseline.ps1 -Rollback"