#!/bin/bash
# deploy-client.sh - Despliegue automático en cliente (UN SOLO COMANDO)
# Uso: sudo ./deploy-client.sh --cliente "Nombre Cliente" [--dominio cliente.com]

set -euo pipefail

APP_DIR="/opt/soluciona"
REPO_URL="https://github.com/tu-org/soluciona-inteligencia-artificial-comercial.git"
CLIENTE=""
DOMINIO=""

log() { echo -e "\033[1;32m[$(date '+%H:%M:%S')]\033[0m $*"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --cliente) CLIENTE="$2"; shift 2 ;;
    --dominio) DOMINIO="$2"; shift 2 ;;
    *) error "Opción: $1" ;;
  esac
done

[[ -z "$CLIENTE" ]] && error "Requiere --cliente \"Nombre del Cliente\""

log "=== Desplegando Soluciona IA para: $CLIENTE ==="

# 1. Instalar Docker si no existe
if ! command -v docker &>/dev/null; then
  log "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
if ! docker compose version &>/dev/null; then
  log "Instalando Docker Compose plugin..."
  apt-get update && apt-get install -y docker-compose-plugin 2>/dev/null || dnf install -y docker-compose-plugin 2>/dev/null
fi

# 2. Clonar/actualizar repo
log "Descargando aplicación..."
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# 3. Configuración automática del cliente
log "Configurando cliente: $CLIENTE"
cp config.example.json config.json
cp .env.example .env

# Generar config.json del cliente
PANEL_PASS=$(openssl rand -base64 12)
JWT_SECRET=$(openssl rand -base64 32)

cat > config.json <<CONFIGEOF
{
  "negocio": "$CLIENTE",
  "puerto": 3000,
  "software": "SOLUCIONA INTELIGENCIA ARTIFICIAL",
  "segmento": "comidas",
  "ciiu": "5611",
  "moneda": "COP",
  "hora_reporte": "21:00",
  "numero_dueno": "",
  "ubicacion_negocio": { "lat": 0, "lng": 0 },
  "domicilios": { "faixas": [], "radio_max_entrega_km": 0, "gratis_si_total_sobre": 0 },
  "panel_password": "$PANEL_PASS",
  "auto_start": true,
  "llm": { "proveedor": "nvidia", "modelo": "meta/llama-3.1-8b-instruct", "limite_diario": 200, "limite_mensual": 5000 },
  "asistentes_ia": { "modelo": "meta/llama-3.3-70b-instruct", "limite_diario": 50, "limite_mensual": 1000 },
  "vision": { "modelo": "meta/llama-3.2-11b-vision-instruct", "limite_diario": 30, "limite_mensual": 500 },
  "gemini_api_key": "",
  "gemini_model": "gemini-1.5-flash",
  "integracion": { "tipo": "pos-propio" },
  "facturacion": { "proveedor": "", "emision_automatica": false, "estado_dispara": "pagado", "enviar_mail": true },
  "alertas": { "telegram": { "token": "", "chat_id": "" } }
}
CONFIGEOF

# .env con secrets
cat > .env <<ENVEOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_ENGINE=sqlite
JWT_SECRET=$JWT_SECRET
JWT_ISSUER=soluciona-inteligencia-artificial-comercial
JWT_AUDIENCE=dashboard
PANEL_PASSWORD=$PANEL_PASS
NEGOCIO=$CLIENTE
SEGMENTO=comidas
CIIU=5611
MONEDA=COP
HORA_REPORTE=21:00
FEATURE_WHATSAPP=true
FEATURE_ORDERS=true
FEATURE_INVENTORY=true
FEATURE_ACCOUNTING=true
FEATURE_AI=true
SECURITY_CSRF_ENABLED=true
SECURITY_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ENVEOF

# 4. Levantar con Docker Compose (usa el docker-compose.yml YA EXISTENTE)
log "Iniciando contenedores..."
docker compose -f docker-compose.yml up -d --build

# 5. Esperar healthcheck
log "Esperando que la app esté lista..."
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log "App respondiendo OK"
    break
  fi
  sleep 2
done

# 6. Firewall
if command -v firewall-cmd &>/dev/null; then
  firewall-cmd --add-port=3000/tcp --permanent && firewall-cmd --reload
elif command -v ufw &>/dev/null; then
  ufw allow 3000/tcp
fi

# 7. Nginx + SSL si hay dominio
if [[ -n "$DOMINIO" ]]; then
  log "Configurando Nginx + SSL para $DOMINIO..."
  dnf install -y nginx certbot python3-certbot-nginx 2>/dev/null || apt install -y nginx certbot python3-certbot-nginx
  cat > /etc/nginx/conf.d/soluciona.conf <<NGINXEOF
server {
    listen 80;
    server_name $DOMINIO;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINXEOF
  nginx -t && systemctl restart nginx
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --email admin@$DOMINIO || true
fi

log "=== DESPLIEGUE COMPLETO ==="
log "Panel: http://${DOMINIO:-IP_DEL_SERVIDOR}:3000/panel-empresarial.html"
log "Credenciales: admin@localhost / 12345"
log "Panel password (config): $PANEL_PASS"
log "Logs: docker compose -f $APP_DIR/docker-compose.yml logs -f"
log ""
log "Para configurar WhatsApp/IA/Facturación: entra al panel → Configuración"
