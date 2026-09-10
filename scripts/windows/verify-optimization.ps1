<#
.SYNOPSIS
    Verificación post-optimización - Métricas clave
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
#>

$ErrorActionPreference = "Stop"
function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }

Write-Log "=== VERIFICACIÓN OPTIMIZACIÓN ==="

Write-Log "`n--- SERVICIOS (esperado: Disabled/Stopped) ---"
Get-Service SysMain,WSearch,DiagTrack,Spooler,XblAuthManager,XblGameSave,XboxGipSvc,XboxNetApiSvc,dptftcs | Select-Object Name,Status,StartType | Format-Table -AutoSize

Write-Log "`n--- DEFENDER ---"
$mp = Get-MpPreference
Write-Log "PUAProtection: $($mp.PUAProtection) (1=Block, 2=Audit)"
Write-Log "CloudBlockLevel: $($mp.CloudBlockLevel)"
Write-Log "DisableRemovableDriveScanning: $($mp.DisableRemovableDriveScanning)"

Write-Log "`n--- HVCI (requiere reinicio si cambió) ---"
try {
    $dg = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard -ErrorAction Stop
    Write-Log "VBS Status: $($dg.VirtualizationBasedSecurityStatus) (0=Off,1=EnabledNotRunning,2=Running)"
    Write-Log "Services: $($dg.SecurityServicesRunning) (2=HVCI, 1=CredentialGuard)"
} catch { Write-Log "No accesible: $_" -Level "WARN" }

Write-Log "`n--- FAST STARTUP ---"
$hb = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -ErrorAction SilentlyContinue
Write-Log "HiberbootEnabled: $($hb.HiberbootEnabled) (1=ON, 0=OFF)"

Write-Log "`n--- ONEDRIVE AUTO-RUN ---"
$od = Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -ErrorAction SilentlyContinue
Write-Log "HKCU\Run OneDriveSetup: $($od.OneDriveSetup -join ', ')"
$tasks = Get-ScheduledTask | Where-Object {$_.TaskName -like "*OneDrive*"}
$tasks | Select-Object TaskName,State | Format-Table -AutoSize

Write-Log "`n--- WSL2 FEATURES ---"
Get-WindowsOptionalFeature -Online | Where-Object {$_.FeatureName -in @("Microsoft-Windows-Subsystem-Linux","VirtualMachinePlatform")} | Select-Object FeatureName,State | Format-Table -AutoSize

Write-Log "`n--- MEMORIA ACTUAL ---"
$os = Get-CimInstance Win32_OperatingSystem
Write-Log "RAM Total: $([math]::Round($os.TotalVisibleMemorySize/1MB,1)) MB"
Write-Log "RAM Libre: $([math]::Round($os.FreePhysicalMemory/1MB,1)) MB"

Write-Log "`n=== COMPARAR CON AUDIT-2026-09-10.md ==="