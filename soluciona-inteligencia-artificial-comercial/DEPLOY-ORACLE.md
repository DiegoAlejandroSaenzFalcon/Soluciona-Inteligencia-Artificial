# Despliegue en Oracle Cloud (Free Tier / Always Free) - Soluciona IA

> **Versión:** 2.0 | **Actualizado:** 2025-08-24 | **Para:** Soluciona IA - Cumplimiento Legal Gratuito

---

## Objetivo

Desplegar **Soluciona IA** en Oracle Cloud Always Free (2 instancias AMD ARM + 10 TB/mes tráfico) con:
- 100% Software Libre (MIT/Apache/GPL)
- Costo $0 (Free Tier + dominio gratuito opcional)
- Cumplimiento DIAN listo para producción
- Seguridad hardening (non-root, TLS, rate-limit, CSP)
- Backups automáticos + monitoreo
- Alta disponibilidad básica (reinicio automático)

---

## Requisitos Previos

| Requisito | Detalle |
|-----------|---------|
| Cuenta Oracle Cloud | Free Tier activa (2 AMD + 4 ARM) |
| Dominio (opcional) | `sudominio.com` o subdominio gratuito (duckdns, noip) |
| Claves SSH | `ssh-keygen -t ed25519` |
| Certificado SSL | Let's Encrypt (automático con Caddy) |
| IP fija (opcional) | Oracle Reserved Public IP (gratis) |

---

## Opción A: Docker + Caddy (Recomendado)

### 1. Preparar VM en Oracle Cloud

```bash
# 1. Crear instancia (Consola OCI)
# Shape: VM.Standard.A1.Flex (ARM) - 4 OCPU, 24 GB RAM
# Image: Ubuntu 22.04 Minimal
# SSH Key: tu clave pública
# Security List: Ingress 0.0.0.0/0 TCP 22, 80, 443, 3000

# 2. Conectar y configurar
ssh ubuntu@<IP_PUBLICA>

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker + Caddy
sudo apt install -y docker.io docker-compose-plugin caddy
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clonar y configurar proyecto

```bash
# Clonar repo
git clone https://github.com/tu-usuario/soluciona-inteligencia-artificial-comercial.git
cd soluciona-inteligencia-artificial-comercial

# Configurar variables de entorno
cp .env.example .env
# EDITAR .env con tus valores:
# - PANEL_PASSWORD=clave_segura_123
# - JWT_SECRET=clave_larga_aleatoria
# - META_TOKEN=token_business_api (si usas WhatsApp Cloud API)
# - WHATSAPP_CLOUD_CALLING_SIDECAR_URL=http://localhost:8081 (opcional)

# Configurar Caddy (TLS automático)
sudo tee /etc/caddy/Caddyfile <<'EOF'
tusitio.com {
    reverse_proxy localhost:3000
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
EOF

# Reiniciar Caddy
sudo systemctl restart caddy
```

### 3. Levantar con Docker Compose

```bash
# Usar docker-compose.yml (incluye app + sidecar WhatsApp opcional)
docker compose up -d --build

# Verificar
docker compose logs -f
curl -f http://localhost:3000/api/health
```

---

## Opción B: systemd (Sin Docker, Máximo Control)

### 1. Node 22 + SQLite nativo

```bash
# Instalar Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version  # v22.x
npm --version

# Crear usuario de servicio
sudo useradd -r -s /bin/false -d /opt/soluciona -m soluciona
```

### 2. Service systemd

```bash
sudo tee /etc/systemd/system/soluciona.service <<'EOF'
[Unit]
Description=Soluciona IA - Plataforma Cumplimiento Legal
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=soluciona
Group=soluciona
WorkingDirectory=/opt/soluciona
ExecStart=/usr/bin/node --experimental-sqlite index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=soluciona

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/soluciona/data /opt/soluciona/logs
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6
RestrictNamespaces=true
LockPersonality=true
MemoryDenyWriteExecute=true

# Límites
LimitNOFILE=65536
LimitNPROC=4096

# Env
Environment=NODE_ENV=production
Environment=DISABLE_WHATSAPP=true
EnvironmentFile=/opt/soluciona/.env

[Install]
WantedBy=multi-user.target
EOF
```

### 3. Deploy

```bash
# Copiar archivos
sudo mkdir -p /opt/soluciona
sudo cp -r * /opt/soluciona/
sudo chown -R soluciona:soluciona /opt/soluciona

# Instalar deps (como usuario soluciona)
sudo -u soluciona bash -c "cd /opt/soluciona && npm ci --omit=dev"

# Habilitar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable --now soluciona
sudo systemctl status soluciona
```

---

## Seguridad (Hardening Obligatorio)

### Firewall (ufw / iptables)

```bash
# Solo puertos necesarios
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH (restringir a tu IP si posible)
sudo ufw allow 80/tcp    # HTTP -> Caddy
sudo ufw allow 443/tcp   # HTTPS -> Caddy
sudo ufw enable

# O iptables directo (Oracle usa iptables)
sudo iptables -A INPUT -p tcp --dport 22 -s TU_IP/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### OCI Security List (Consola Web)

| Regla | Protocolo | Puerto | Origen |
|-------|-----------|--------|--------|
| SSH | TCP | 22 | TU_IP/32 (tu IP fija) |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |
| App Directo | TCP | 3000 | 0.0.0.0/0 (solo si sin Caddy) |

### Fail2Ban (Anti-fuerza bruta)

```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

[soluciona-auth]
enabled = true
port = 3000
filter = soluciona-auth
logpath = /opt/soluciona/logs/app.log
maxretry = 5
bantime = 1800
findtime = 300
EOF

# Filtro personalizado para logs de la app
sudo tee /etc/fail2ban/filter.d/soluciona-auth.conf <<'EOF'
[Definition]
failregex = .*login failed.*from <HOST>.*
ignoreregex =
EOF

sudo systemctl restart fail2ban
```

---

## Backups Automáticos (Crítico)

### Script de Backup

```bash
sudo tee /opt/soluciona/scripts/backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/soluciona/backups"
DATE=$(date +%F_%H-%M-%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# 1. SQLite DB
sqlite3 /opt/soluciona/data/neurallgo.db ".backup $BACKUP_DIR/db_$DATE.sqlite"

# 2. Config + certs
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" -C /opt/soluciona .env data/*.p12 data/*.pem 2>/dev/null || true

# 3. Logs recientes (últimos 7 días)
find /opt/soluciona/logs -type f -mtime -7 -name "*.log" | tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" -T -

# 4. Subir a Object Storage (opcional - OCI CLI)
# oci os object put -bn soluciona-backups --file "$BACKUP_DIR/db_$DATE.sqlite" --name "db/db_$DATE.sqlite"

# Limpieza local
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completado: $DATE"
EOF

chmod +x /opt/soluciona/scripts/backup.sh
```

### Cron Diario (2:00 AM)

```bash
sudo -u soluciona crontab -e
# Agregar:
0 2 * * * /opt/soluciona/scripts/backup.sh >> /opt/soluciona/logs/backup.log 2>&1
```

### Restauración

```bash
# Restaurar DB
sqlite3 /opt/soluciona/data/neurallgo.db ".restore /opt/soluciona/backups/db_2025-01-15_02-00-00.sqlite"

# Restaurar config
tar -xzf /opt/soluciona/backups/config_2025-01-15_02-00-00.tar.gz -C /opt/soluciona/
sudo systemctl restart soluciona
```

---

## Monitoreo y Alertas (Gratuito)

### Prometheus + Grafana (Docker Compose)

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports: ["9090:9090"]
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    ports: ["3001:3000"]
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'soluciona'
    static_configs:
      - targets: ['host.docker.internal:3000']
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']
```

### Alertas Telegram (Gratis)

```bash
# En .env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890

# Script alerta simple
cat > /opt/soluciona/scripts/alert.sh <<'EOF'
#!/bin/bash
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" \
  -d text="ALERTA Soluciona: $1" \
  -d parse_mode=HTML
EOF
chmod +x /opt/soluciona/scripts/alert.sh
```

### Log Rotation

```bash
sudo tee /etc/logrotate.d/soluciona <<'EOF'
/opt/soluciona/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 soluciona soluciona
    sharedscripts
    postrotate
        systemctl reload soluciona > /dev/null 2>&1 || true
    endscript
}
EOF
```

---

## Checklist Post-Despliegue

| Verificación |
|--------------|
| `curl -f https://tusitio.com/api/health` → 200 OK |
| Panel legacy: `https://tusitio.com/` → Login admin/12345 → Dashboard |
| Panel empresarial: `https://tusitio.com/panel-empresarial.html` → Login admin@localhost/12345 + 2FA |
| 2FA obligatorio admin → QR escaneable + código 6 dígitos |
| Menú empresarial: CRUD productos + guardado en DIAN |
| Inventario: CRUD productos/stock → respuesta < 500ms |
| Contabilidad: Factura + NC + envío DIAN → CUFE válido |
| WhatsApp: QR conexión + mensajes entrantes/salientes |
| Backups: `/opt/soluciona/backups/db_<fecha>.sqlite` existe |
| Logs rotando: `/opt/soluciona/logs/*.log.gz` |
| TLS: `curl -I https://tusitio.com` → `Strict-Transport-Security` |
| Rate limit: 6 intentos login fallidos → 429 Too Many Requests |
| CSRF: POST sin token → 403 Forbidden |
| Backup diario: cron ejecuta a las 2:00 AM |
| Alerta Telegram: probar `./scripts/alert.sh "Test"` |

---

## Troubleshooting Común

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Puerto 3000 no responde | App caída / puerto ocupado | `systemctl status soluciona` / `docker compose logs` |
| DIAN 400 Bad Request | XML inválido / CUFE mal generado | Revisar logs `/opt/soluciona/logs/app.log` |
| WhatsApp QR no aparece | Baileys versión / cache auth | `rm -rf auth_info && reiniciar` |
| 2FA no valida | Reloj servidor desincronizado | `timedatectl set-ntp true` |
| Backup falla | Permisos / espacio disco | `df -h / chown soluciona:soluciona backups` |
| TLS no funciona | Caddy no puede validar dominio | DNS A/AAAA apuntando a IP, puerto 80/443 abiertos |

---

## Referencias Normativas (Para Desarrollo)

| Documento | URL |
|-----------|-----|
| Resolución 000042/2020 (Anexo Técnico) | https://normograma.dian.gov.co/ |
| Resolución 000020/2021 (NC/ND) | https://normograma.dian.gov.co/ |
| Esquemas XSD UBL 2.1 DIAN | https://www.dian.gov.co/transaccional/prevalidadores/ |
| Prevalidador Factura Electrónica | https://storagecdndian.blob.core.windows.net/.../Factura%20electrónica.zip |
| Certificados DIAN/ONAC | https://www.dian.gov.co/firma-e/ |

---

## Contribuir al Cumplimiento Legal

> **Este proyecto existe para que ninguna pequeña empresa en Colombia cierre por no poder costear software de facturación legal.**

¿Encontraste un gap normativo?
1. Fork → Issue con **referencia exacta** (Resolución, Artículo, Literal)
2. PR con implementación + test de validación
3. Actualiza `LEGAL-COMPLIANCE.md`

---

**Licencia:** MIT — Úsalo, mejóralo, compártelo.
**Misión:** Que ninguna pyme cierre por no poder facturar legalmente.