<#
.SYNOPSIS
    Toggle HVCI (Memory Integrity) - requiere reinicio
.DESCRIPTION
    Desactivar HVCI libera ~300-500 MB RAM + reduce overhead CPU en i3-N305.
    Requiere reinicio para efecto real.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
#>

param(
    [ValidateSet("Enable","Disable","Status")]
    [string]$Action = "Status",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }

function Get-VBSStatus {
    try {
        $dg = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard -ErrorAction Stop
        return @{ VBS=$dg.VirtualizationBasedSecurityStatus; HVCI=($dg.SecurityServicesRunning -contains 2); CG=($dg.SecurityServicesRunning -contains 1) }
    } catch { return @{ VBS=-1; HVCI=$false; CG=$false; Error=$_ } }
}

$st = Get-VBSStatus
Write-Log "Actual: VBS=$($st.VBS) HVCI=$($st.HVCI) CG=$($st.CG) (0=Off, 1=EnabledNotRunning, 2=Running)"

switch ($Action) {
    "Status" {
        Write-Host @"
IMPACTO EN i3-N305 (8 GB):
  HVCI ON  -> +Seguridad kernel, -300-500 MB RAM, -5-15% CPU E-cores
  HVCI OFF -> -Seguridad kernel, +300-500 MB RAM, +5-15% CPU
Estado actual: HVCI $($st.HVCI) (requiere reinicio si cambiaste registro)
"@
    }
    "Disable" {
        if ($st.HVCI -eq $false) { Write-Log "HVCI ya OFF" -Level "WARN"; exit 0 }
        if (-not $Force) { $c=Read-Host "Confirmar DESACTIVAR HVCI? (s/N)"; if($c -ne 's' -and $c -ne 'S'){exit 0} }
        reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 0 /f
        reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 0 /f
        reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 0 /f
        Write-Log "Registros listos. REINICIO REQUERIDO: shutdown /r /t 0"
    }
    "Enable" {
        if ($st.HVCI -eq $true) { Write-Log "HVCI ya ON" -Level "WARN"; exit 0 }
        reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 1 /f
        reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
        reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 1 /f
        Write-Log "Registros listos. REINICIO REQUERIDO"
    }
}