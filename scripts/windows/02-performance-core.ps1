<#
.SYNOPSIS
    Fase 2: Rendimiento núcleo - Desactivar servicios pesados, OneDrive, Fast Startup, montar D:
.DESCRIPTION
    SysMain, WSearch, OneDrive, Hiberboot, partición 236 GB → D:
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Ejecutar como Administrador
#>

param(
    [switch]$Rollback,
    [switch]$WhatIf,
    [string]$DataDriveLetter = "D"
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
    try { & $Script; Write-Log "OK: $Desc" } catch { Write-Log "FAIL: $Desc - $_" -Level "ERROR"; throw }
}

# ========== ROLLBACK ==========
if ($Rollback) {
    Write-Log "=== ROLLBACK FASE 2 ==="
    Invoke-Cmd { Set-Service SysMain -StartupType Automatic; Start-Service SysMain } "Restaurar SysMain (Superfetch)"
    Invoke-Cmd { Set-Service WSearch -StartupType Automatic; Start-Service WSearch } "Restaurar Windows Search"
    Invoke-Cmd {
        # OneDrive: reinstalar si se desinstaló
        if (-not (Get-Command "OneDrive.exe" -ErrorAction SilentlyContinue)) {
            Write-Log "OneDrive desinstalado - reinstalar manual: winget install Microsoft.OneDrive"
        }
    } "OneDrive: requiere reinstalación manual"
    Invoke-Cmd {
        reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power /v HiberbootEnabled /t REG_DWORD /d 0 /f
        powercfg /h off
    } "Desactivar Fast Startup / Hibernación"
    Invoke-Cmd {
        $vol = Get-Volume -DriveLetter $DataDriveLetter -ErrorAction SilentlyContinue
        if ($vol) { Remove-PartitionAccessPath -DiskNumber 0 -PartitionNumber 6 -AccessPath "$($DataDriveLetter):\" -ErrorAction SilentlyContinue }
    } "Desmontar partición D:"
    Write-Log "Rollback Fase 2 completado"
    exit 0
}

# ========== APLICAR ==========
Write-Log "=== FASE 2: RENDIMIENTO NÚCLEO ==="

# 1. SysMain (Superfetch) → Disabled
Invoke-Cmd {
    Stop-Service SysMain -Force -ErrorAction SilentlyContinue
    Set-Service SysMain -StartupType Disabled
} "Desactivar SysMain (Superfetch) - libera RAM/CPU en NVMe"

# 2. Windows Search (WSearch) → Disabled
Invoke-Cmd {
    Stop-Service WSearch -Force -ErrorAction SilentlyContinue
    Set-Service WSearch -StartupType Disabled
} "Desactivar Windows Search - usar 'Everything' (voidtools)"

# 3. OneDrive → Desinstalar completo
$odPath = "$env:SYSTEMROOT\System32\OneDriveSetup.exe"
if (Test-Path $odPath) {
    Invoke-Cmd {
        # Matar procesos OneDrive
        Get-Process -Name "OneDrive*" -ErrorAction SilentlyContinue | Stop-Process -Force
        # Desinstalar
        & "$env:SYSTEMROOT\System32\OneDriveSetup.exe" /uninstall
        Start-Sleep 3
        # Limpiar restos
        Remove-Item "$env:LOCALAPPDATA\Microsoft\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:APPDATA\Microsoft\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "OneDriveSetup" -ErrorAction SilentlyContinue
    } "Desinstalar OneDrive completo"
} else {
    Write-Log "OneDrive no detectado en System32 - ya desinstalado o ubicación distinta" -Level "WARN"
}

# 4. Tareas programadas OneDrive → Desactivar
Invoke-Cmd {
    $tasks = Get-ScheduledTask | Where-Object {$_.TaskName -like "*OneDrive*" -and $_.State -ne 'Disabled'}
    foreach ($t in $tasks) { Disable-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath }
    Write-Log "  Tareas OneDrive desactivadas: $($tasks.Count)"
} "Desactivar tareas programadas OneDrive"

# 5. Fast Startup (Hiberboot) → Activado
Invoke-Cmd {
    powercfg /h /type full
    reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power /v HiberbootEnabled /t REG_DWORD /d 1 /f
    Write-Log "  Hibernación activada (full) + HiberbootEnabled=1"
} "Activar Fast Startup / Hibernación completa"

# 6. Montar partición 236 GB (Partición 6) como D:
Invoke-Cmd {
    $part = Get-Partition -DiskNumber 0 -PartitionNumber 6 -ErrorAction Stop
    if (-not $part.DriveLetter) {
        Add-PartitionAccessPath -DiskNumber 0 -PartitionNumber 6 -AccessPath "$($DataDriveLetter):\" 
        Write-Log "  Partición 6 montada en $($DataDriveLetter):\"
    } else {
        Write-Log "  Partición 6 ya tiene letra: $($part.DriveLetter)"
    }
    # Verificar filesystem
    $vol = Get-Volume -DriveLetter $DataDriveLetter -ErrorAction SilentlyContinue
    if ($vol -and $vol.FileSystem -eq "RAW") {
        Write-Log "  ADVERTENCIA: Partición es RAW (Linux fs). No formatear si quieres recuperar RHEL." -Level "WARN"
        Write-Log "  Para usar en Windows: Format-Volume -DriveLetter $DataDriveLetter -FileSystem NTFS" -Level "WARN"
    }
} "Montar partición 236 GB (Partición 6) como $DataDriveLetter:"

Write-Log "=== FASE 2 COMPLETADA ==="
Write-Log "Rollback: .\02-performance-core.ps1 -Rollback"
Write-Log "NOTA: Si partición D: es RAW (Linux), NO formatear hasta recuperar RHEL."