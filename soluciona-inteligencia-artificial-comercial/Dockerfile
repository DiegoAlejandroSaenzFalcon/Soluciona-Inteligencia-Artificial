# Dockerfile - Soluciona IA (oficial, seguro, multi-stage)
# Imagen base: Node 22 Alpine (más ligera y segura)
FROM node:22-alpine AS builder

# Instalar dependencias de build (para módulos nativos como sharp, bcrypt, etc.)
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copiar package files y instalar dependencias
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- Stage 2: Runtime ---
FROM node:22-alpine AS runtime

# Instalar dependencias de runtime (sqlite, tzdata, dumb-init)
RUN apk add --no-cache sqlite tzdata dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S soluciona && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G soluciona -g soluciona soluciona

WORKDIR /app

# Copiar dependencias y código desde builder
COPY --from=builder --chown=soluciona:soluciona /app/node_modules ./node_modules
COPY --chown=soluciona:soluciona package*.json ./
COPY --chown=soluciona:soluciona . .

# Crear directorios necesarios con permisos correctos
RUN mkdir -p data logs uploads && chown -R soluciona:soluciona data logs uploads

# Variables de entorno de producción
ENV NODE_ENV=production
ENV TZ=America/Bogota

# Puerto expuesto
EXPOSE 3000

# Health check (usa endpoint /api/health)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Cambiar a usuario no-root
USER soluciona

# Usar dumb-init para manejo correcto de señales (SIGTERM, etc.)
ENTRYPOINT ["dumb-init", "--"]

# --experimental-sqlite requerido por node:sqlite en Node 22
CMD ["node", "--experimental-sqlite", "index.js"]