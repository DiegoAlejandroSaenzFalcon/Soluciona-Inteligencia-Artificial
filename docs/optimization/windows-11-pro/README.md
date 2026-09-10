# Optimización Windows 11 Pro — Máximo Rendimiento (Sin BitLocker)

> **Equipo:** LENOVO 82XB (IdeaPad) | **CPU:** i3-N305 (8E/8T, 1.8–3.8 GHz) | **RAM:** 8 GB LPDDR5-4800 (soldada) | **Disco:** 512 GB NVMe | **Build:** 26200 (25H2)
> **Fecha:** 2026-09-10 | **Autor:** Diego Saenz | **Rol:** Senior Dev / Platform Engineer

---

## 🎯 Objetivo

**Máximo rendimiento real** sin romper estabilidad del SO. Sin BitLocker (laptop no sale de casa, datos en nube). Optimización **cautelosa pero efectiva**: cada cambio es reversible, documentado y probado.

---

## 📊 Cuellos de Botella Identificados

| Componente | Hallazgo | Impacto |
|------------|----------|---------|
| **RAM** | 8 GB soldada, ~1.3 GB libre bajo carga | 🔴 Crítico — swapping a NVMe |
| **VBS/HVCI** | Activo (Memory Integrity) | 🟡 5–15% CPU/RAM overhead en E-cores |
| **SysMain (Superfetch)** | Activo en NVMe + RAM escasa | 🟡 Precarga inútil, consume RAM/CPU |
| **Windows Search (WSearch)** | Indexador activo | 🟡 CPU/IO sostenido |
| **OneDrive** | Residente + startup + tareas | 🟡 ~150 MB RAM + IO |
| **Spooler** | Activo sin impresoras | 🟢 Superficie de ataque + memoria |
| **Arranque rápido** | Desactivado | 🟢 Boot más lento (~10-15s) |
| **Partición 236 GB** | Sin usar (ex-RHEL) | 🟢 Espacio desperdiciado |
| **NetBIOS/TCP 139** | Activo en LAN | 🟢 Superficie de ataque local |

---

## ✅ Plan de Acción (Orden de Prioridad)

### Fase 0 — Base (Ya hecho)
- [x] Auditar hardware, servicios, startup, seguridad
- [x] Confirmar: **BitLocker OFF** (decisión deliberada), **HVCI ON** (evaluar), **Contraseña admin: NINGUNA** (⚠️ corregir)
- [x] WSL2 habilitado para recuperación RHEL

### Fase 1 — Seguridad Mínima Imprescindible
| Acción | Comando | Reversible |
|--------|---------|------------|
| Poner contraseña al usuario admin | `net user "Diego Saenz" *` | ✅ |
| Endurecer política de contraseñas local | `net accounts /minpwlen:12 /maxpwage:90 /uniquepw:12 /lockoutthreshold:5` | ✅ |
| Desactivar NetBIOS sobre TCP/IP | Ver script `disable-netbios.ps1` | ✅ |
| Desactivar Spooler (si no imprime) | `Set-Service Spooler -StartupType Disabled` | ✅ |
| Endurecer Defender (PUA, Cloud, USB) | `Set-MpPreference -PUAProtection 1 -CloudBlockLevel 1 -DisableRemovableDriveScanning $false` | ✅ |

### Fase 2 — Rendimiento Núcleo (Alto impacto, bajo riesgo)
| Acción | Ganancia estimada | Script |
|--------|-------------------|--------|
| Desactivar SysMain (Superfetch) | +300-500 MB RAM, menos CPU | `disable-sysmain.ps1` |
| Desactivar Windows Search (WSearch) | Menos IO/CPU sostenido | `disable-wsearch.ps1` |
| Desinstalar OneDrive completo | +150 MB RAM, menos IO/startup | `remove-onedrive.ps1` |
| Activar Arranque Rápido (Hiberboot) | Boot ~10-15s más rápido | `enable-faststartup.ps1` |
| Asignar letra D: a partición 236 GB | Espacio para datos/cachés/VMs | `mount-partition-d.ps1` |

### Fase 3 — Decisión Crítica: VBS/HVCI (Memory Integrity)
| Opción | RAM liberada | CPU overhead | Seguridad | Recomendación |
|--------|--------------|--------------|-----------|---------------|
| **Mantener ON** | 0 | ~5-15% | Máxima (kernel hardening) | Si datos sensibles / compliance |
| **Desactivar OFF** | ~300-500 MB | -5-15% | Standard (UAC + Defender + VBS base) | **Recomendado para este caso** (8 GB, solo ofimática/dev, laptop en casa) |

> **Decisión del usuario:** Desactivar HVCI → `core isolation` en Seguridad de Windows → Memory integrity = Off → Reiniciar.

### Fase 4 — Limpieza y Ajustes Finos
- Desactivar características opcionales innecesarias (VirtualMachinePlatform, WCF, Printing, RemoteDesktop, etc.)
- Configurar Brave: Memory Saver ON, limitar procesos
- Instalar "Everything" (voidtools) para búsqueda instantánea sin indexador
- Mover `TEMP`, `TMP`, cachés de navegadores a `D:\Temp`
- Crear imagen de sistema (Macrium Reflect Free) como snapshot "golden config"

---

## 📁 Estructura del Repo

```
docs/optimization/windows-11-pro/
├── README.md                    # Este archivo
├── AUDIT-2026-09-10.md          # Auditoría completa (generada)
├── DECISIONS.md                 # Registro de decisiones y tradeoffs
├── ROLLBACK.md                  # Cómo revertir cada cambio
scripts/windows/
├── 01-security-baseline.ps1     # Fase 1: Seguridad mínima
├── 02-performance-core.ps1      # Fase 2: Rendimiento núcleo
├── 03-vbs-hvci-toggle.ps1       # Fase 3: Activar/Desactivar HVCI
├── 04-fine-tuning.ps1           # Fase 4: Ajustes finos
├── 05-rhel-grub-recovery.ps1    # Recuperar boot RHEL vía WSL2
├── verify-optimization.ps1      # Verificar estado post-optimización
└── rollback-all.ps1             # Revertir todo a estado original
```

---

## ⚠️ Reglas de Oro (Senior Dev)

1. **Un cambio a la vez** → verificar → siguiente
2. **Snapshot antes de tocar** (punto de restauración + imagen disco)
3. **Todo reversible** → cada script tiene su `rollback-*.ps1`
4. **Mide, no adivines** → `verify-optimization.ps1` compara antes/después
5. **Documenta en `DECISIONS.md`** cada `why` y `tradeoff`

---

## 🔄 Próximos Pasos Inmediatos

1. **Reiniciar** para completar WSL2
2. Ejecutar `scripts/windows/05-rhel-grub-recovery.ps1` → recupera boot RHEL
3. Ejecutar `scripts/windows/01-security-baseline.ps1` → base seguridad
4. Ejecutar `scripts/windows/02-performance-core.ps1` → ganar RAM/CPU
5. **Decidir HVCI** → ejecutar `03-vbs-hvci-toggle.ps1` según criterio
6. Ejecutar `scripts/windows/04-fine-tuning.ps1` → pulido final
7. Ejecutar `verify-optimization.ps1` → métricas antes/después
8. Commit + push a GitHub