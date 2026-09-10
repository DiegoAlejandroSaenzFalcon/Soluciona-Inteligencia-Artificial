# Registro de Decisiones — Optimización Windows 11 Pro

> **Fecha:** 2026-09-10 | **Equipo:** LENOVO 82XB (i3-N305, 8 GB, 512 NVMe) | **Build:** 26200

---

## 📋 Metodología

Cada decisión sigue: **Problema → Opciones → Tradeoff → Decisión → Reversibilidad**

---

## 1. BitLocker: DESACTIVADO (Decisión Previa del Usuario)

| Aspecto | Detalle |
|---------|---------|
| **Problema** | BitLocker consume CPU (AES-NI) y añade latencia IO |
| **Contexto** | Laptop nunca sale de casa, datos en nube (GitHub, cloud), formateos frecuentes por estudio/trabajo |
| **Tradeoff** | - Seguridad física: **PERDIDA** (robo = datos accesibles)<br>- Rendimiento: **GANADO** (sin overhead cifrado)<br>- Recuperación: **SIMPLIFICADA** (sin claves de recuperación) |
| **Decisión** | **MANTENER OFF** (decisión del usuario, informada) |
| **Reversibilidad** | `manage-bde -on C:` en cualquier momento |
| **Mitigación** | Contraseña admin fuerte + UAC + HVCI + Defender endurecido |

---

## 2. Contraseña Admin: ESTABLECER (Obligatorio)

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Usuario "Diego Saenz" en grupo Administradores **sin contraseña** (PasswordRequired=False) |
| **Riesgo** | Acceso físico = control total; malware user-space = admin total |
| **Decisión** | **ESTABLECER contraseña fuerte (12+ chars)** + política local endurecida |
| **Reversibilidad** | `net user "Diego Saenz" ""` (quitar) — **NO RECOMENDADO** |

---

## 3. HVCI (Memory Integrity / VBS): DESACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Problema** | HVCI activo en i3-N305 (8 E-cores, 8 GB RAM) consume ~300-500 MB RAM + 5-15% CPU |
| **Estado actual** | ACTIVO (SecurityServicesRunning={2}) |
| **Tradeoff** | - Seguridad kernel: **REDUCIA** (sin HVCI, exploits kernel más fáciles)<br>- Rendimiento: **MEJORA SIGNIFICATIVA** en RAM/CPU limitados<br>- VBS base: **SE MANTIENE** (VirtualizationBasedSecurityStatus=2 → puede bajar a 0) |
| **Decisión** | **DESACTIVAR** (recomendado para este perfil: 8 GB, laptop casa, ofimática/dev) |
| **Comando** | `.\03-vbs-hvci-toggle.ps1 -Action Disable -Force` |
| **Reversibilidad** | `.\03-vbs-hvci-toggle.ps1 -Action Enable -Force` + reinicio |
| **Nota** | Si en futuro maneja datos sensibles/certificaciones → REACTIVAR |

---

## 4. SysMain (Superfetch): DESACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Precarga agresiva en NVMe + RAM 8 GB = presión memoria innecesaria |
| **Tradeoff** | - Arranque apps: **LIGERAMENTE MÁS LENTO** (primera vez)<br>- RAM libre: **+300-500 MB**<br>- CPU/IO fondo: **REDUCIDO** |
| **Decisión** | **DESACTIVAR** (NVMe rápido hace precarga irrelevante) |
| **Reversibilidad** | `Set-Service SysMain -StartupType Automatic` |

---

## 5. Windows Search (WSearch): DESACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Indexador constante consume CPU/IO en segundo plano |
| **Alternativa** | **Everything (voidtools)** — búsqueda instantánea por MFT, sin indexador residente |
| **Decisión** | **DESACTIVAR WSearch + INSTALAR Everything** |
| **Reversibilidad** | `Set-Service WSearch -StartupType Automatic` |

---

## 6. OneDrive: DESINSTALAR COMPLETO

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Residente (~150 MB RAM) + startup + 3 tareas programadas + sync en fondo |
| **Contexto** | Usuario usa GitHub/cloud, no necesita sync local de OneDrive |
| **Decisión** | **DESINSTALAR** (`OneDriveSetup.exe /uninstall` + limpieza registro + tareas) |
| **Reversibilidad** | `winget install Microsoft.OneDrive` |

---

## 7. Fast Startup (Hiberboot): ACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Estado actual** | DESACTIVADO (HiberbootEnabled=0, HibernateEnabled vacío) |
| **Tradeoff** | - Boot frío: **~10-15s más lento**<br>- Hibernación: **DISPONIBLE** (ahorro energía real)<br>- Riesgo: **BAJO** en SSD NVMe sano, sin dual-boot Linux en misma partición EFI |
| **Decisión** | **ACTIVAR** (ganancia neta en tiempo de encendido diario) |
| **Reversibilidad** | `powercfg /h off` + reg HiberbootEnabled=0 |

---

## 8. Partición 236 GB (ex-RHEL): MONTAR COMO D: (Condicional)

| Aspecto | Detalle |
|---------|---------|
| **Estado** | Partición 6 (236 GB) = filesystem Linux (ext4/xfs/LVM) — RAW en Windows |
| **Opciones** | A) Formatear NTFS → D: para datos/cachés/VMs (PIERDE RHEL)<br>B) Mantener RAW → Recuperar RHEL primero, luego decidir |
| **Decisión** | **NO FORMATEAR HASTA RECUPERAR RHEL** — montar en WSL para GRUB repair, luego evaluar |
| **Acción** | Script `05-rhel-grub-recovery.ps1` usa WSL2 para montar y reparar GRUB |

---

## 9. NetBIOS sobre TCP/IP: DESACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Puerto 139 escuchando en LAN (192.168.20.49) — superficie de ataque local |
| **Decisión** | **DESACTIVAR** en adaptadores físicos |
| **Reversibilidad** | `Set-NetIPv4Protocol -Dhcp NetbiosOverTcpipEnabled` |

---

## 10. Spooler (Print Spooler): DESACTIVAR

| Aspecto | Detalle |
|---------|---------|
| **Condición** | Solo si **0 impresoras** detectadas |
| **Decisión** | **DESACTIVAR** (PrintNightmare, memoria, superficie) |
| **Reversibilidad** | `Set-Service Spooler -StartupType Automatic` |

---

## 11. Defender Endurecido: PUA=Block, CloudBlock=High, ScanUSB=On

| Aspecto | Detalle |
|---------|---------|
| **Cambios** | PUAProtection: 2→1 (Block), CloudBlockLevel: 0→1 (High), DisableRemovableDriveScanning: True→False |
| **Impacto** | Mejor protección, overhead despreciable |
| **Reversibilidad** | `Set-MpPreference -PUAProtection 2 -CloudBlockLevel 0 -DisableRemovableDriveScanning $true` |

---

## 12. Características Opcionales: DESACTIVAR 11 Features

| Feature | Justificación |
|---------|---------------|
| VirtualMachinePlatform | WSL2 ya instalado por separado; feature Hyper-V no necesaria |
| WorkFolders-Client | Solo entornos empresariales |
| WCF-Services45 / WCF-TCP-PortSharing45 | Legacy .NET 4.5, no usado |
| SmbDirect | RDMA/SMB Direct — solo servidores |
| Printing-* | Sin impresoras |
| MSRDC-Infrastructure | Remote Desktop infra — no usado |
| NetFx4-AdvSrvs | ASP.NET 4.5+ — no hostea IIS |
| Microsoft-RemoteDesktopConnection | Cliente RDP — no conecta a otros |

**Mantenidas:** SearchEngine-Client-Package, WindowsMediaPlayer, Windows-Defender-Default-Definitions

---

## 13. TEMP/TMP → D:\Temp

| Aspecto | Detalle |
|---------|---------|
| **Condición** | Solo si D: existe y es NTFS (tras formatear partición 6) |
| **Beneficio** | Descongesta C:, usa espacio abundante en D:, IO paralelo |
| **Reversibilidad** | Variables de entorno → default |

---

## 14. Plan Energía: BALANCED (Mantener)

| Aspecto | Detalle |
|---------|---------|
| **Análisis** | i3-N305 es SoC 15W móvil; "Alto rendimiento" solo fija clocks máximos → más calor/consumo sin ganancia real en burst |
| **Decisión** | **MANTENER BALANCED** (óptimo para este hardware) |

---

## 15. RHEL Dual-Boot: RECUPERAR VIA WSL2

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Windows reescritura MBR/EFI al formatear → GRUB perdido |
| **Solución** | WSL2 (Ubuntu) → montar p5 (/boot), p6 (LVM root), p1 (EFI) → chroot → `grub2-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=RHEL` + `grub2-mkconfig` |
| **Riesgo** | Bajo — opera solo en particiones Linux y EFI shared |
| **Fallback** | USB Live RHEL → Rescue mode → chroot /mnt/sysimage → grub2-install |

---

## 📊 Resumen de Impacto Estimado

| Métrica | Antes | Después (Estimado) | Delta |
|---------|-------|-------------------|-------|
| RAM libre (idle) | ~1.3 GB | ~2.5-3.0 GB | **+1.2-1.7 GB** |
| RAM libre (carga Brave+dev) | ~0.5 GB | ~1.5-2.0 GB | **+1-1.5 GB** |
| CPU fondo (idle) | ~3-5% | ~1-2% | **-2-3%** |
| Boot time | ~25-30s | ~12-18s | **-10-15s** |
| IO fondo | Alto (SysMain+WSearch+OneDrive) | Mínimo | **↓↓↓** |
| Seguridad kernel (HVCI) | ON | OFF | **⚠️ Reducida** |
| Seguridad físico (BitLocker) | OFF | OFF | **Sin cambio** |
| Superficie ataque local | Media (NetBIOS, Spooler, WSearch) | Baja | **✅ Mejorada** |

---

## ✅ Checklist de Ejecución

- [ ] Reiniciar para completar WSL2
- [ ] `.\05-rhel-grub-recovery.ps1` → Recuperar RHEL boot
- [ ] `.\01-security-baseline.ps1` → Contraseña, políticas, NetBIOS, Spooler, Defender
- [ ] `.\02-performance-core.ps1` → SysMain, WSearch, OneDrive, Fast Startup, D:
- [ ] `.\03-vbs-hvci-toggle.ps1 -Action Disable -Force` → Desactivar HVCI
- [ ] `.\04-fine-tuning.ps1` → Features, TEMP, Brave, Everything
- [ ] `.\verify-optimization.ps1` → Métricas post
- [ ] Commit + push a GitHub
- [ ] Crear imagen sistema (Macrium Reflect Free) → Snapshot "golden config"