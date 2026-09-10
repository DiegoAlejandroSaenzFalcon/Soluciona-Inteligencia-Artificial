<#
.SYNOPSIS
    Verificar estado post-optimización - Métricas antes/después
.DESCRIPTION
    Recopila métricas clave: RAM libre, servicios, startup, Defender, BitLocker, HVCI, disco, boot time.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
#>

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }
function Section { param([string]$Title); Write-Host "`n========== $Title ==========" }

Section "HARDWARE Y SISTEMA"
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor
$disk = Get-PhysicalDisk | Where-Object {$_.DeviceId -eq 0}
$mem = Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum
Write-Log "OS: $($os.Caption) Build $($os.BuildNumber)"
Write-Log "Modelo: $($cs.Manufacturer) $($cs.Model)"
Write-Log "CPU: $($cpu.Name) - $($cpu.NumberOfCores)C/$($cpu.NumberOfLogicalProcessors)T @ $($cpu.MaxClockSpeed) MHz"
Write-Log "RAM Total: $([math]::Round($mem.Sum/1GB,1)) GB | Libre: $([math]::Round($os.FreePhysicalMemory/1MB,1)) MB"
Write-Log "Disco: $($disk.FriendlyName) - $($disk.MediaType) - $([math]::Round($disk.Size/1GB)) GB - Health: $($disk.HealthStatus)"

Section "SEGURIDAD"
$def = Get-MpComputerStatus
Write-Log "Defender RT: $($def.RealTimeProtectionEnabled) | Firmas: $($def.AntivirusSignatureLastUpdated) | Tamper: $($def.TamperProtectionSource)"
$pref = Get-MpPreference
Write-Log "Defender PUA: $($pref.PUAProtection) (1=Block,2=Audit) | CloudBlock: $($pref.CloudBlockLevel) | ScanUSB: $($pref.DisableRemovableDriveScanning)"
$fw = Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
$fw | Format-Table -AutoSize | Out-Host
$bl = Get-BitLockerVolume | Select-Object MountPoint, ProtectionStatus, EncryptionPercentage
$bl | Format-Table -AutoSize | Out-Host
$uac = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -ErrorAction SilentlyContinue
Write-Log "UAC EnableLUA: $($uac.EnableLUA) | ConsentPrompt: $($uac.ConsentPromptBehaviorAdmin) | SecureDesktop: $($uac.PromptOnSecureDesktop)"
$vbs = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard -ErrorAction SilentlyContinue
Write-Log "VBS Status: $($vbs.VirtualizationBasedSecurityStatus) | Services: $($vbs.SecurityServicesRunning)"

Section "SERVICIOS CRÍTICOS"
$svcs = @('SysMain','WSearch','Spooler','DiagTrack','OneDrive*','Brave*','Edge*')
foreach ($s in $svcs) {
    $svc = Get-Service -Name $s -ErrorAction SilentlyContinue
    if ($svc) { Write-Log "$($svc.Name): $($svc.Status) / $($svc.StartType)" }
}

Section "STARTUP"
Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | Format-Table -AutoSize | Out-Host

Section "DISCO Y PARTICIONES"
Get-Partition -DiskNumber 0 | Select-Object PartitionNumber, DriveLetter, Type, @{n='SizeGB';e={[math]::Round($_.Size/1GB,1)}}, IsActive | Format-Table -AutoSize | Out-Host
Get-Volume | Format-Table -AutoSize | Out-Host

Section "RECURSOS (TOP 15 PROCESOS)"
Get-Process | Sort-Object WorkingSet64 -Desc | Select -First 15 Name, Id, @{n='MemMB';e={[math]::Round($_.WS/1MB)}}, CPU | Format-Table -AutoSize | Out-Host

Section "TEMPERATURA / THROTTLING (si disponible)"
try { Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object @{n='TempC';e={[math]::Round(($_.CurrentTemperature/10)-273.15,1)}} | Format-Table } catch { Write-Log "Thermal zones no accesibles" -Level "WARN" }

Write-Log "`n=== VERIFICACIÓN COMPLETA ==="
Write-Log "Comparar con baseline AUDIT-2026-09-10.md"