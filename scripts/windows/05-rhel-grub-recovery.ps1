<#
.SYNOPSIS
    Recuperar arranque RHEL (GRUB) en dual-boot con Windows 11
.DESCRIPTION
    Usa WSL2 (Ubuntu/Alpine) para montar particiones RHEL y reinstalar GRUB en la partición EFI.
    Partición 5 (2 GB) = /boot (ext4/xfs)
    Partición 6 (236 GB) = LVM root (/) o /home
    Partición 1 (200 MB) = EFI System (shared con Windows)
.NOTES
    Autor: Diego Saenz | Fecha: 2026-09-10
    Requiere: WSL2 instalado + reinicio previo
    Ejecutar como Administrador en PowerShell
#>

param(
    [switch]$WhatIf,
    [string]$WslDistro = "Ubuntu",
    [switch]$InstallDistro
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$Msg,[string]$Level="INFO"); $ts=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Write-Host "[$ts] [$Level] $Msg" }

# Verificar WSL
$wslStatus = wsl --status 2>&1
if ($wslStatus -match "no est") {
    Write-Log "WSL2 no instalado. Instalando..." -Level "WARN"
    if ($InstallDistro -or $WhatIf) {
        Invoke-Cmd { wsl --install -d $WslDistro } "Instalar WSL2 + $WslDistro"
        Write-Log "REINICIO REQUERIDO tras instalar WSL. Vuelve a ejecutar este script." -Level "WARN"
        exit 0
    } else {
        throw "WSL2 no instalado. Ejecuta con -InstallDistro o manual: wsl --install -d Ubuntu"
    }
}

# Instalar distro si no existe
$distros = wsl --list --verbose 2>&1
if ($distros -notmatch $WslDistro) {
    Write-Log "Distro $WslDistro no encontrada. Instalando..." -Level "WARN"
    Invoke-Cmd { wsl --install -d $WslDistro } "Instalar $WslDistro"
    Write-Log "REINICIO REQUERIDO. Vuelve a ejecutar." -Level "WARN"
    exit 0
}

Write-Log "=== RECUPERACIÓN GRUB RHEL VIA WSL2 ==="

# Identificar particiones en WSL (lsblk)
Write-Log "1/6: Identificando particiones en WSL..."
$lsblk = wsl -d $WslDistro -- lsblk -f -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT 2>&1
Write-Log "lsblk output:`n$lsblk"

# Montar particiones
Write-Log "2/6: Montando particiones RHEL..."
$mountScript = @"
set -euo pipefail
echo "=== Montando particiones ==="
# Partición EFI (nvme0n1p1)
mkdir -p /mnt/efi
mount -t vfat /dev/nvme0n1p1 /mnt/efi 2>/dev/null || echo "EFI ya montado o error"

# Partición /boot RHEL (nvme0n1p5 - 2 GB)
mkdir -p /mnt/boot
mount /dev/nvme0n1p5 /mnt/boot 2>/dev/null && echo "/boot montado" || echo "Error montando /boot (p5)"

# Partición LVM root (nvme0n1p6 - 236 GB)
# Si es LVM, activar VG
vgchange -ay 2>/dev/null
LV_PATH=\$(lvs --noheadings -o lv_path 2>/dev/null | grep -E 'root|\/' | head -1 | xargs)
if [ -n "\$LV_PATH" ]; then
    mkdir -p /mnt/root
    mount "\$LV_PATH" /mnt/root 2>/dev/null && echo "Root LVM montado: \$LV_PATH" || echo "Error montando root LVM"
else
    echo "No se detectó LVM root, intentando montar directo..."
    mount /dev/nvme0n1p6 /mnt/root 2>/dev/null && echo "Root montado directo" || echo "Error montando p6"
fi

echo "=== Verificando estructura ==="
ls -la /mnt/boot/
ls -la /mnt/efi/EFI/
"@

if (-not $WhatIf) {
    wsl -d $WslDistro -- bash -c "$mountScript" 2>&1 | ForEach-Object { Write-Log "WSL: $_" }
} else {
    Write-Log "[WHATIF] Montar particiones en WSL"
}

# Detectar kernel/initramfs y configurar GRUB
Write-Log "3/6: Detectando kernels RHEL y configurando GRUB..."
$grubScript = @"
set -euo pipefail
echo "=== Buscando kernels en /boot ==="
ls -la /mnt/boot/vmlinuz-* /mnt/boot/initramfs-* 2>/dev/null | head -20

echo "=== Instalando GRUB en EFI ==="
# Bind mounts para chroot
mount --bind /dev /mnt/root/dev 2>/dev/null
mount --bind /proc /mnt/root/proc 2>/dev/null
mount --bind /sys /mnt/root/sys 2>/dev/null
mount --bind /mnt/boot /mnt/root/boot 2>/dev/null
mount --bind /mnt/efi /mnt/root/boot/efi 2>/dev/null

# Instalar GRUB (RHEL usa grub2-efi)
chroot /mnt/root /bin/bash << 'CHROOT_EOF'
set -euo pipefail
echo "Dentro del chroot RHEL"
grub2-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=RHEL --recheck --no-floppy 2>&1
grub2-mkconfig -o /boot/grub2/grub.cfg 2>&1
echo "GRUB instalado y configurado"
CHROOT_EOF

# Cleanup
umount /mnt/root/boot/efi /mnt/root/boot /mnt/root/sys /mnt/root/proc /mnt/root/dev 2>/dev/null
echo "=== GRUB recovery completado ==="
"@

if (-not $WhatIf) {
    wsl -d $WslDistro -- bash -c "$grubScript" 2>&1 | ForEach-Object { Write-Log "WSL: $_" }
} else {
    Write-Log "[WHATIF] Instalar GRUB en EFI via chroot"
}

# Verificar entrada en firmware EFI
Write-Log "4/6: Verificando entrada EFI..."
if (-not $WhatIf) {
    $efiEntries = wsl -d $WslDistro -- efibootmgr -v 2>&1
    Write-Log "Entradas EFI:`n$efiEntries"
}

# Opcional: Añadir entrada Windows al GRUB de RHEL (os-prober)
Write-Log "5/6: Configurando os-prober para detectar Windows..."
$osproberScript = @"
chroot /mnt/root /bin/bash << 'EOF'
dnf install -y os-prober 2>/dev/null || yum install -y os-prober 2>/dev/null
grub2-mkconfig -o /boot/grub2/grub.cfg
EOF
"@
if (-not $WhatIf) {
    wsl -d $WslDistro -- bash -c "$osproberScript" 2>&1 | ForEach-Object { Write-Log "WSL: $_" }
}

# Desmontar
Write-Log "6/6: Desmontando..."
$umountScript = @"
umount /mnt/root /mnt/boot /mnt/efi 2>/dev/null; echo "Desmontado"
"@
if (-not $WhatIf) {
    wsl -d $WslDistro -- bash -c "$umountScript" 2>&1 | ForEach-Object { Write-Log "WSL: $_" }
}

Write-Log "=== RECUPERACIÓN GRUB COMPLETADA ==="
Write-Log "REINICIA y verifica menú GRUB con opción RHEL y Windows"
Write-Log "Si falla: usa USB live RHEL → Troubleshooting → Rescue a RHEL system → chroot /mnt/sysimage → grub2-install..."