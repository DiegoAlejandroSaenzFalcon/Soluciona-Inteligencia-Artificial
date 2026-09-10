<#
.SYNOPSIS
    Fase 3: Toggle VBS/HVCI (Memory Integrity) - Core Isolation
.DESCRIPTION
    Activa o desactiva Hypervisor-protected Code Integrity (HVCI).
    DESACTIVAR gana ~300-500 MB RAM + reduce CPU overhead ~5-15% en i3-N305.
    ACTIVAR mantiene máxima protección kernel (exploit mitigation).
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Requiere reinicio. Ejecutar como Administrador.
#>

param(
    [ValidateSet("Enable","Disable","Status")]
    [string]$Action = "Status",
    [switch]$Force,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Msg, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] [$Level] $Msg"
}

function Get-VBSStatus {
    try {
        $dg = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard -ErrorAction Stop
        $vbs = $dg.VirtualizationBasedSecurityStatus
        $svcs = $dg.SecurityServicesRunning
        $hvci = $svcs -contains 2
        $cg = $svcs -contains 1
        return @{ VBS=$vbs; HVCI=$hvci; CredentialGuard=$cg; Raw=$dg }
    } catch {
        return @{ VBS=-1; HVCI=$false; CredentialGuard=$false; Error=$_ }
    }
}

$status = Get-VBSStatus
Write-Log "Estado actual VBS: $($status.VBS) | HVCI: $($status.HVCI) | CredentialGuard: $($status.CredentialGuard)"
# VBS: 0=Off, 1=On but not running, 2=Running

switch ($Action) {
    "Status" {
        $msg = @"
Estado Core Isolation (VBS/HVCI):
  VirtualizationBasedSecurityStatus: $($status.VBS) (0=Off, 1=EnabledNotRunning, 2=Running)
  HVCI (Memory Integrity): $(if($status.HVCI){"ACTIVO"}else{"INACTIVO"})
  Credential Guard: $(if($status.CredentialGuard){"ACTIVO"}else{"INACTIVO"})

IMPACTO EN i3-N305 (8 GB RAM):
  HVCI ON:  +Seguridad kernel, -~300-500 MB RAM, -5-15% CPU en E-cores
  HVCI OFF: -Seguridad kernel, +~300-500 MB RAM, +5-15% CPU disponible

RECOMENDACIÓN PARA ESTE CASO:
  Laptop en casa, datos en nube, 8 GB RAM, uso ofimática/dev/estudio
  → DESACTIVAR HVCI para maximizar recursos disponibles
"@
        Write-Host $msg
    }

    "Disable" {
        if ($status.HVCI -eq $false) { Write-Log "HVCI ya está DESACTIVADO" -Level "WARN"; exit 0 }
        if (-not $Force -and -not $WhatIf) {
            $confirm = Read-Host "⚠️ DESACTIVAR HVCI reduce seguridad kernel. Confirmar? (s/N)"
            if ($confirm -ne 's' -and $confirm -ne 'S') { Write-Log "Cancelado"; exit 0 }
        }
        Invoke-Cmd {
            # Desactivar via registro (equivalente a UI Security > Core Isolation > Memory Integrity = Off)
            reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 0 /f
            reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 0 /f
            # También desactivar Credential Guard si está activo
            reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 0 /f
            Write-Log "Registros modificados. REINICIO REQUERIDO."
        } "Desactivar HVCI + Credential Guard via registro"
        if (-not $WhatIf) {
            Write-Log "✅ HVCI desactivado. Ejecuta: shutdown /r /t 0"
        }
    }

    "Enable" {
        if ($status.HVCI -eq $true) { Write-Log "HVCI ya está ACTIVO" -Level "WARN"; exit 0 }
        Invoke-Cmd {
            reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 1 /f
            reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
            reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 1 /f
            Write-Log "Registros modificados. REINICIO REQUERIDO."
        } "Activar HVCI + Credential Guard via registro"
        if (-not $WhatIf) {
            Write-Log "✅ HVCI activado. Ejecuta: shutdown /r /t 0"
        }
    }
}

function Invoke-Cmd {
    param([scriptblock]$Script, [string]$Desc)
    if ($WhatIf) { Write-Log "[WHATIF] $Desc" -Level "WARN"; return }
    try { & $Script; Write-Log "OK: $Desc" } catch { Write-Log "FAIL: $Desc - $_" -Level "ERROR"; throw }
}