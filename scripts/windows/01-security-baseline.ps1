<# 
.SYNOPSIS
    Fase 1: Seguridad mínima imprescindible - Windows 11 Pro
.DESCRIPTION
    Establece contraseña admin, endurece políticas locales, desactiva NetBIOS/TCP, Spooler, endurece Defender.
    Cada función tiene su rollback correspondiente.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Ejecutar como Administrador
#>

param(
    [switch]$Rollback,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Msg, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] [$Level] $Msg"
}

function Invoke-Cmd {
    param([scriptblock]$Script, [string]$Desc)
    if ($WhatIf) { Write-Log "[WHATIF] $Desc" -Level "WARN"; return }
    try {
        & $Script
        Write-Log "OK: $Desc"
    } catch {
        Write-Log "FAIL: $Desc - $_" -Level "ERROR"
        throw
    }
}

# ========== ROLLBACK ==========
if ($Rollback) {
    Write-Log "=== ROLLBACK FASE 1 ==="
    Invoke-Cmd { net accounts /minpwlen:0 /maxpwage:42 /uniquepw:0 /lockoutthreshold:10 } "Restaurar políticas contraseña default"
    Invoke-Cmd { Set-Service Spooler -StartupType Automatic; Start-Service Spooler } "Restaurar Spooler"
    Invoke-Cmd { 
        Set-MpPreference -PUAProtection 2 -CloudBlockLevel 0 -DisableRemovableDriveScanning $true 
    } "Restaurar Defender defaults"
    Invoke-Cmd {
        # NetBIOS: restaurar a default (0 = habilitado por DHCP)
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($a in $adapters) {
            Set-NetIPv4Protocol -InterfaceIndex $a.InterfaceIndex -Dhcp NetbiosOverTcpipEnabled -ErrorAction SilentlyContinue
        }
    } "Restaurar NetBIOS default"
    Write-Log "Rollback Fase 1 completado"
    exit 0
}

# ========== APLICAR ==========
Write-Log "=== FASE 1: SEGURIDAD BASE ==="

# 1. Contraseña admin (interactiva - requiere input manual)
Write-Log "1/5: Establecer contraseña para 'Diego Saenz' (se abrirá prompt)"
if (-not $WhatIf) { net user "Diego Saenz" * }

# 2. Políticas de contraseña locales
Invoke-Cmd {
    net accounts /minpwlen:12 /maxpwage:90 /uniquepw:12 /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30
} "Políticas contraseña: min 12 chars, max 90 días, historial 12, lockout 5/30min"

# 3. NetBIOS sobre TCP/IP → Desactivado
Invoke-Cmd {
    $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and $_.InterfaceDescription -notmatch "Virtual|Hyper-V|WSL"}
    foreach ($a in $adapters) {
        Set-NetIPv4Protocol -InterfaceIndex $a.InterfaceIndex -Dhcp NetbiosOverTcpipDisabled -ErrorAction Stop
        Write-Log "  NetBIOS desactivado en: $($a.Name) [$($a.InterfaceDescription)]"
    }
} "Desactivar NetBIOS sobre TCP/IP en adaptadores físicos activos"

# 4. Spooler → Disabled (si no hay impresoras)
$printers = Get-Printer -ErrorAction SilentlyContinue
if ($printers.Count -eq 0) {
    Invoke-Cmd {
        Stop-Service Spooler -Force -ErrorAction SilentlyContinue
        Set-Service Spooler -StartupType Disabled
    } "Desactivar Print Spooler (sin impresoras detectadas)"
} else {
    Write-Log "Impresoras detectadas: $($printers.Count) - Spooler se mantiene ACTIVO" -Level "WARN"
}

# 5. Defender endurecido
Invoke-Cmd {
    Set-MpPreference `
        -PUAProtection 1 `
        -CloudBlockLevel 1 `
        -DisableRemovableDriveScanning $false `
        -DisableCatchupQuickScan $true `
        -MAPSReporting 2 `
        -SubmitSamplesConsent 1
} "Endurecer Defender: PUA=Block, CloudBlock=High, Scan USB=On"

Write-Log "=== FASE 1 COMPLETADA ==="
Write-Log "Rollback disponible: .\01-security-baseline.ps1 -Rollback"