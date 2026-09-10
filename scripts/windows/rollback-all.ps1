<#
.SYNOPSIS
    Rollback completo - Revierte TODOS los cambios de optimización
.DESCRIPTION
    Ejecuta en orden inverso. Requiere reinicio al final.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
#>

param([switch]$Force,[switch]$WhatIf)

$ErrorActionPreference = "Stop"
function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }

Write-Log "=== ROLLBACK COMPLETO ==="
if (-not $Force -and -not $WhatIf) { $c=Read-Host "Revertir TODO? (s/N)"; if($c -ne 's' -and $c -ne 'S'){exit 0} }

# 1. HVCI -> Enable (default Windows)
Write-Log "1/4: Restaurando HVCI (ON)..."
if (-not $WhatIf) {
    reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 1 /f
    reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
    reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 1 /f
}

# 2. Servicios -> defaults
Write-Log "2/4: Restaurando servicios..."
$svcs = @("SysMain","WSearch","DiagTrack","Spooler","XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc","dptftcs")
if (-not $WhatIf) { $svcs | ForEach { Set-Service $_ -StartupType Automatic -ErrorAction SilentlyContinue; Start-Service $_ -ErrorAction SilentlyContinue } }

# 3. OneDrive auto-arranque -> ON
Write-Log "3/4: Restaurando OneDrive auto-inicio..."
if (-not $WhatIf) {
    Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "OneDriveSetup" -Value "C:\Windows\System32\OneDriveSetup.exe /thfirstsetup" -ErrorAction SilentlyContinue
    $tasks = Get-ScheduledTask | Where-Object {$_.TaskName -like "*OneDrive*"}
    foreach ($t in $tasks) { Enable-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -ErrorAction SilentlyContinue }
}

# 4. Fast Startup -> OFF (default)
Write-Log "4/4: Fast Startup OFF..."
if (-not $WhatIf) {
    reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f
    powercfg /h off
}

# 5. WSL2 features (lo que agregué) - opcional
Write-Log "5/5: WSL2 features (lo que agregué)..."
if (-not $WhatIf) {
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    # VirtualMachinePlatform estaba antes, no la toco
}

Write-Log "=== ROLLBACK COMPLETO LISTO ==="
Write-Log "REINICIO REQUERIDO: shutdown /r /t 0"