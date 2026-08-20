# nuevo-ticket.ps1 — soluciona
# Crea un ticket de soporte y lanza el triage automático (agente triager).
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/nuevo-ticket.ps1 -Cliente "MiEmpresa" -Descripcion "El correo no envia mensajes desde hoy"
param(
    [Parameter(Mandatory = $true)][string]$Cliente,
    [Parameter(Mandatory = $true)][string]$Descripcion,
    [string]$Documento = "SN",
    [string]$Canal = "manual"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$clienteSlug = ($Cliente -replace "[^A-Za-z0-9]+", "-").Trim("-").ToLower()
if (-not $clienteSlug) { $clienteSlug = "cliente" }
$docSlug = ($Documento -replace "[^A-Za-z0-9]+", "").ToUpper()
if (-not $docSlug) { $docSlug = "SN" }

$id = "TKT-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$folderName = "${clienteSlug}__doc-${docSlug}"
$dir = Join-Path $root "tickets\$folderName\$id"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$ahora = (Get-Date).ToString("s")

$ticket = [ordered]@{
    id            = $id
    cliente       = $Cliente
    documento     = $Documento
    estado        = "nuevo"
    prioridad     = $null
    categoria     = $null
    tipo          = $null
    en_kb         = $null
    resumen       = $Descripcion
    canal         = $Canal
    fecha_apertura = $ahora
    aprobacion    = $null
    ejecucion     = $null
    cierre        = $null
}
$ticket | ConvertTo-Json | Set-Content -Path (Join-Path $dir "ticket.json") -Encoding UTF8

@"
# Ticket $id — $Cliente (Doc/ID: $Documento)

**Fecha apertura**: $ahora
**Estado**: nuevo
**Canal**: $Canal

## Descripcion del problema
$Descripcion

## Progreso (append-only)
- [ ] Triage (agente triager)
- [ ] Propuesta enviada / aprobacion
- [ ] Ejecucion autorizada
- [ ] Verificacion y cierre
"@ | Set-Content -Path (Join-Path $dir "ticket.md") -Encoding UTF8

Write-Host "[soluciona] Ticket creado: $dir"

$prompt = @"
Procesa el ticket en `"$dir`" (archivos ticket.json y ticket.md):
realiza el triage segun tus instrucciones y deja el resultado en triage.md.
Solo trabaja dentro de `"$dir`".
"@

Write-Host "[soluciona] Lanzando triage con el agente triager..."
& cmd.exe /c "opencode run --agent triager `"$prompt`""
if ($LASTEXITCODE -ne 0) { Write-Warning "Triage finalizado con codigo $LASTEXITCODE (revisar ticket)." }
Write-Host "[soluciona] Listo. Revisa: $dir"
