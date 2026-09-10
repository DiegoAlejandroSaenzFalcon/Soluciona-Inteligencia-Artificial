<#
.SYNOPSIS
    Fase 2: Rendimiento - Servicios, Fast Startup, (NO OneDrive uninstall, NO WSL2, NO Macrium)
.DESCRIPTION
    Desactiva servicios pesados, activa Fast Startup. OneDrive queda instalado con auto-arranque OFF.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
#>

param(
    [switch]$Rollback,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }
function Invoke-Cmd { param([scriptblock]$Script,[string]$Desc) if($WhatIf){Write-Log "[WHATIF] $Desc" -Level "WARN";return} try{&$Script;Write-Log "OK: $Desc"}catch{Write-Log "FAIL: $Desc - $_" -Level "ERROR";throw} }

if ($Rollback) {
    Write-Log "=== ROLLBACK FASE 2 ==="
    Invoke-Cmd { Set-Service SysMain -StartupType Automatic; Start-Service SysMain } "Restaurar SysMain"
    Invoke-Cmd { Set-Service WSearch -StartupType Automatic; Start-Service WSearch } "Restaurar WSearch"
    Invoke-Cmd { Set-Service DiagTrack -StartupType Automatic; Start-Service DiagTrack } "Restaurar DiagTrack"
    Invoke-Cmd { Set-Service Spooler -StartupType Automatic; Start-Service Spooler } "Restaurar Spooler"
    Invoke-Cmd { 
        "XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc","dptftcs" | ForEach { Set-Service $_ -StartupType Manual -ErrorAction SilentlyContinue }
    } "Restaurar servicios Xbox/Intel a Manual"
    Invoke-Cmd {
        reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power /v HiberbootEnabled /t REG_DWORD /d 0 /f
        powercfg /h off
    } "Desactivar Fast Startup"
    Write-Log "Rollback Fase 2 completado"
    exit 0
}

Write-Log "=== FASE 2: RENDIMIENTO ==="

$servicios = @("SysMain","WSearch","DiagTrack","Spooler","XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc","dptftcs")
foreach ($s in $servicios) {
    Invoke-Cmd { Set-Service $s -StartupType Disabled } "$s -> Disabled"
}

# Fast Startup ON
Invoke-Cmd {
    powercfg /h /type full
    reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 1 /f
} "Fast Startup activado (hibernación completa)"

Write-Log "=== FASE 2 COMPLETADA ==="
Write-Log "Rollback: .\02-performance-core.ps1 -Rollback"