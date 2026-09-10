# Rollback Completo — Guía de Reversión

> **Última actualización:** 2026-09-10 | **Versión:** 1.0

---

## ⚠️ Antes de Ejecutar

1. **Lee este archivo completo**
2. **Ten acceso a Admin (PowerShell elevado)**
3. **Ideal: punto de restauración previo o imagen Macrium Reflect**
4. **Orden inverso al despliegue** — Fase 4 → 3 → 2 → 1

---

## 🔄 Rollback Automatizado (Recomendado)

```powershell
# Desde scripts/windows/
.\rollback-all.ps1 -Force
# Requiere reinicio al final
```

El script ejecuta en orden:
1. `04-fine-tuning.ps1 -Rollback` — Features, TEMP
2. `03-vbs-hvci-toggle.ps1 -Action Enable -Force` — Reactivar HVCI
3. `02-performance-core.ps1 -Rollback` — SysMain, WSearch, OneDrive, Fast Startup, D:
4. `01-security-baseline.ps1 -Rollback` — Políticas, Spooler, Defender, NetBIOS
5. Reactiva **TODAS** las características opcionales Windows

---

## 🔧 Rollback Manual por Fase

### Fase 4: Ajustes Finos
```powershell
.\04-fine-tuning.ps1 -Rollback
# O manual:
Enable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform","WorkFolders-Client","WCF-Services45","WCF-TCP-PortSharing45","SmbDirect","Printing-PrintToPDFServices-Features","Printing-Foundation-Features","Printing-Foundation-InternetPrinting-Client","MSRDC-Infrastructure","NetFx4-AdvSrvs","Microsoft-RemoteDesktopConnection" -NoRestart
# TEMP/TMP → default
[Environment]::SetEnvironmentVariable("TEMP","%USERPROFILE%\AppData\Local\Temp","User")
[Environment]::SetEnvironmentVariable("TMP","%USERPROFILE%\AppData\Local\Temp","User")
reg delete HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TEMP /f
reg delete HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v TMP /f
```

### Fase 3: HVCI (Memory Integrity)
```powershell
.\03-vbs-hvci-toggle.ps1 -Action Enable -Force
# O manual:
reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity /v Enabled /t REG_DWORD /d 1 /f
reg add HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
reg add HKLM\SYSTEM\CurrentControlSet\Control\LSA /v LsaCfgFlags /t REG_DWORD /d 1 /f
# REINICIO OBLIGATORIO
```

### Fase 2: Rendimiento Núcleo
```powershell
.\02-performance-core.ps1 -Rollback
# O manual:
Set-Service SysMain -StartupType Automatic; Start-Service SysMain
Set-Service WSearch -StartupType Automatic; Start-Service WSearch
# OneDrive: reinstalar manual
winget install Microsoft.OneDrive
# Fast Startup OFF
reg add HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power /v HiberbootEnabled /t REG_DWORD /d 0 /f
powercfg /h off
# Desmontar D:
Remove-PartitionAccessPath -DiskNumber 0 -PartitionNumber 6 -AccessPath "D:\"
```

### Fase 1: Seguridad Base
```powershell
.\01-security-baseline.ps1 -Rollback
# O manual:
net accounts /minpwlen:0 /maxpwage:42 /uniquepw:0 /lockoutthreshold:10
Set-Service Spooler -StartupType Automatic; Start-Service Spooler
Set-MpPreference -PUAProtection 2 -CloudBlockLevel 0 -DisableRemovableDriveScanning $true
# NetBIOS default
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
foreach ($a in $adapters) { Set-NetIPv4Protocol -InterfaceIndex $a.InterfaceIndex -Dhcp NetbiosOverTcpipEnabled }
```

---

## 🔍 Verificación Post-Rollback

```powershell
.\verify-optimization.ps1
```

Compara salida con `AUDIT-2026-09-10.md` — deben coincidir valores originales.

---

## 🆘 Rollback de Emergencia (Si algo rompe el boot)

### Opción A: Punto de Restauración (si existe)
1. `rstrui.exe` → Siguiente → Mostrar más puntos → Seleccionar anterior a optimización

### Opción B: Imagen Macrium Reflect (Recomendado)
1. Boot USB Macrium Reflect
2. Restore → Select image → "golden config" → Restore

### Opción C: Windows RE (Entorno de Recuperación)
1. Reinicio forzado 3 veces → Auto-repair → Opciones avanzadas → Símbolo del sistema
2. `rstrui.exe` o `dism /image:C:\ /cleanup-image /restorehealth`

### Opción D: Reinstalación Limpia (Último recurso)
- USB Windows 11 → Instalación personalizada → Formatear C: → Limpiar

---

## 📋 Checklist Rollback

- [ ] Ejecutar `.\rollback-all.ps1 -Force`
- [ ] Reiniciar
- [ ] Ejecutar `.\verify-optimization.ps1`
- [ ] Confirmar:
  - [ ] HVCI ACTIVO (VBS=2, Services={2})
  - [ ] SysMain RUNNING + Auto
  - [ ] WSearch RUNNING + Auto
  - [ ] Spooler RUNNING + Auto (si impresoras)
  - [ ] OneDrive instalado + procesos
  - [ ] Fast Startup OFF (HiberbootEnabled=0)
  - [ ] NetBIOS enabled en adaptadores
  - [ ] Defender defaults (PUA=2, CloudBlock=0, ScanUSB=True)
  - [ ] Políticas contraseña default
  - [ ] Features opcionales todas habilitadas
  - [ ] TEMP/TMP en %USERPROFILE%\AppData\Local\Temp
  - [ ] Partición 6 sin letra (RAW/Linux)

---

## 📝 Notas Importantes

| Componente | Nota |
|------------|------|
| **HVCI** | Cambio requiere reinicio; verifica en `Seguridad de Windows > Aislamiento del núcleo > Integridad de memoria` |
| **OneDrive** | Rollback no reinstala — hacer `winget install Microsoft.OneDrive` manual |
| **Partición D:** | Si formateaste a NTFS, rollback solo quita letra; datos permanecen |
| **RHEL GRUB** | Rollback no afecta — script 05 solo lee/repara, no modifica Windows |
| **Contraseña admin** | Rollback NO quita contraseña — usar `net user "Diego Saenz" ""` si se desea (no recomendado) |

---

*Documento vivo — Actualizar tras cada cambio en `DECISIONS.md`*