<#
.SYNOPSIS
    Rollback completo - Revertir TODOS los cambios de optimización
.DESCRIPTION
    Ejecuta rollback de todas las fases en orden inverso.
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Ejecutar como Administrador
#>

param(
    [switch]$Force,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }

Write-Log "=== ROLLBACK COMPLETO - TODAS LAS FASES ==="
if (-not $Force -and -not $WhatIf) {
    $confirm = Read-Host "⚠️ Esto revertirá TODOS los cambios. Confirmar? (s/N)"
    if ($confirm -ne 's' -and $confirm -ne 'S') { Write-Log "Cancelado"; exit 0 }
}

$scripts = @(
    @{Path=".\04-fine-tuning.ps1"; Args="-Rollback"},
    @{Path=".\03-vbs-hvci-toggle.ps1"; Args="-Action Enable -Force"},  # Restaurar HVCI ON (default Windows)
    @{Path=".\02-performance-core.ps1"; Args="-Rollback"},
    @{Path=".\01-security-baseline.ps1"; Args="-Rollback"}
)

foreach ($s in $scripts) {
    $fullPath = Join-Path (Split-Path $MyInvocation.MyCommand.Path) $s.Path
    if (Test-Path $fullPath) {
        Write-Log "Ejecutando rollback: $($s.Path) $($s.Args)"
        if (-not $WhatIf) {
            & powershell -ExecutionPolicy Bypass -File $fullPath $s.Args
        } else {
            Write-Log "[WHATIF] $fullPath $($s.Args)"
        }
    } else {
        Write-Log "No encontrado: $fullPath" -Level "WARN"
    }
}

# Restaurar características opcionales (lista completa)
Write-Log "Restaurando características opcionales Windows..."
$allFeatures = @(
    "VirtualMachinePlatform","WorkFolders-Client","WCF-Services45","WCF-TCP-PortSharing45",
    "SmbDirect","Printing-PrintToPDFServices-Features","Printing-Foundation-Features",
    "Printing-Foundation-InternetPrinting-Client","MSRDC-Infrastructure","NetFx4-AdvSrvs",
    "Microsoft-RemoteDesktopConnection","SearchEngine-Client-Package","WindowsMediaPlayer",
    "Windows-Defender-Default-Definitions"
)
foreach ($f in $allFeatures) {
    if (-not $WhatIf) {
        Enable-WindowsOptionalFeature -Online -FeatureName $f -NoRestart -ErrorAction SilentlyContinue
    }
    Write-Log "  $f: habilitado"
}

Write-Log "=== ROLLBACK COMPLETO FINALIZADO ==="
Write-Log "REINICIO REQUERIDO para aplicar todos los cambios (HVCI, Fast Startup, servicios)"