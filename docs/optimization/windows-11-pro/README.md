# Optimización Windows 11 Pro — Máximo Rendimiento (Sin BitLocker, Sin WSL2, OneDrive instalado)

> **Ejecutado:** 2026-09-10 | **Hardware:** i3-N305 / 8 GB LPDDR5 / 512 GB NVMe | **Build:** 26200

---

## ✅ Cambios Aplicados (Reversibles)

| Componente | Acción | Rollback |
|------------|--------|----------|
| **WSL2** | `Microsoft-Windows-Subsystem-Linux` + `VirtualMachinePlatform` **Desactivados** | `dism /online /enable-feature ...` |
| **SysMain (Superfetch)** | Disabled | `Set-Service SysMain -StartupType Automatic` |
| **Windows Search (WSearch)** | Disabled | `Set-Service WSearch -StartupType Automatic` |
| **DiagTrack (Telemetría)** | Disabled | `Set-Service DiagTrack -StartupType Automatic` |
| **Spooler** | Disabled (0 impresoras) | `Set-Service Spooler -StartupType Automatic` |
| **Xbox services** | Disabled (9 servicios) | `Set-Service ... -StartupType Manual` |
| **Intel dptftcs** | Disabled | `Set-Service dptftcs -StartupType Automatic` |
| **Defender PUA** | `1` (Block) | `Set-MpPreference -PUAProtection 2` |
| **Defender CloudBlock** | `1` (High) | `Set-MpPreference -CloudBlockLevel 0` |
| **Defender Scan USB** | On | `Set-MpPreference -DisableRemovableDriveScanning $true` |
| **OneDrive** | **Instalado** + auto-arranque OFF (Run key + 3 tareas) | `Set-ItemProperty HKCU\Run...` + Enable tasks |
| **Fast Startup (Hiberboot)** | ON (`HiberbootEnabled=1` + hibernación full) | `powercfg /h off` + reg `0` |
| **HVCI (Memory Integrity)** | **OFF** (registro listo, requiere **reinicio**) | `.\03-vbs-hvci-toggle.ps1 -Action Enable` |
| **NetBIOS/TCP** | OFF en adaptadores físicos | `Set-NetIPv4Protocol ... NetbiosOverTcpipEnabled` |

---

## 📊 Estado Post-Optimización (Pre-Reboot HVCI)

```
Servicios críticos:    TODOS Disabled/Stopped ✓
Defender PUA:          1 (Block) ✓
OneDrive auto-run:     OFF (instalado intacto) ✓
WSL2 features:         Ambas Disabled ✓
Fast Startup:          ON ✓
HVCI:                  Registro listo → reinicio requerido
```

---

## 🔄 Rollback Completo

```powershell
cd scripts/windows
.\rollback-all.ps1 -Force
shutdown /r /t 0
```

Rollback individual por fase:
- `.\01-security-baseline.ps1 -Rollback`
- `.\02-performance-core.ps1 -Rollback`
- `.\03-vbs-hvci-toggle.ps1 -Action Enable -Force` (+ reinicio)

---

## ⚠️ Pendiente: Arranque RHEL

La partición EFI **no contiene archivos GRUB** (`.efi` de redhat/fedora). Los reinicios de Windows los borraron.
- **Solución nativa Windows**: imposible sin los binarios `.efi`.
- **Requiere**: RHEL/Fedora Live USB → Rescue mode → `grub2-install --target=x86_64-efi --efi-directory=/boot/efi` + `grub2-mkconfig`.
- Sin live USB o WSL2, **no recuperable** desde Windows puro.

---

## 📁 Scripts del Repo

```
scripts/windows/
├── 01-security-baseline.ps1     # Contraseña, políticas, NetBIOS, Spooler, Defender
├── 02-performance-core.ps1      # Servicios Disabled, Fast Startup ON
├── 03-vbs-hvci-toggle.ps1       # HVCI Enable/Disable/Status
├── rollback-all.ps1             # Rollback total orden inverso
└── verify-optimization.ps1      # Métricas post-cambios
```