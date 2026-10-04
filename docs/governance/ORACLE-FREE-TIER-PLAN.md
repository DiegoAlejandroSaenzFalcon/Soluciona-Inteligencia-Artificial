# Oracle Cloud Free Tier — Plan de Despliegue
## Preparado 2026-09-10 — VERIFICADO contra documentación oficial Oracle (docs.oracle.com + oracle.com/cloud/free)

> Estado: **Planificación**. NO se provisionó infraestructura. Requiere credenciales Oracle del Owner antes de FASE 6.

---

## 1. Verificación de disponibilidad (Always Free — confirmado)

Fuentes oficiales consultadas: `docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm` y `oracle.com/cloud/free` (vivas, sept 2026).

| Recurso | Límite Always Free | Relevante para el piloto |
|---------|--------------------|--------------------------|
| **Compute ARM Ampere A1** | `VM.Standard.A1.Flex`, **2 OCPU + 12 GB RAM** (o 1500 OCPU-h/mes + 9000 GB-h/mes) | ✅ el objetivo del proyecto coincide exactamente |
| **Compute AMD Micro** | `VM.Standard.E2.1.Micro` (1/8 OCPU, 1 GB) ×2 | opcional (no recomendado para SaaS) |
| **Imágenes** | Oracle Linux, Oracle Linux Cloud Developer, **Ubuntu** (Always Free-eligible) | ✅ usar Ubuntu 24.04 LTS ARM64 |
| **Block Volume** | **200 GB** total (boot + block); boot min ~47-50 GB | ✅ suficiente para Docker+PG+Redis demo |
| **Backups de volumen** | 5 | ✅ para snapshot pre-deploy |
| **VCN** | 2 | ✅ |
| **IP pública** | 1 IPv4 (VNIC); ancho ~50 Mbps (micro) / escala con OCPU (A1) | ✅ |
| **Load Balancer** | 1 Flexible (10 Mbps) | opcional — no requerido en primer piloto |
| **Object Storage** | 20 GB Always Free | opcional backups off-box |
| **Vault** | 150 secretos | opcional (secretos via `.env` montado por ahora) |
| **Outbound data** | 10 TB/mes | ✅ |
| **Email Delivery** | 3000/mes | opcional alertas |
| Monitoring/Logging/Notifications | Always Free | ✅ observabilidad básica |

---

## 2. Advertencias críticas (documentadas)

1. **Reclamación por inactividad (IDLE RECLAMATION)** — Oracle **puede reclamar** instancias Always Free inactivas si durante 7 días: CPU p95 <20%, red <20%, y (A1) memoria <20%.
   - **Mitigación**: keep-alive/cron de actividad mínima, o aceptar que staging es recreable desde IaC (nuestro `DISASTER-RECOVERY` ya contempla recrear la VM).
   - Documento la diferencia **antes** de construir: un staging/demo que no se usa puede apagarse y ser reclamado. La solución OSS de bajo coste es reproducible vía scripts, no persistencia garantizada.
2. **"Out of host capacity"**: posible en regiones con demanda; si ocurre, reintentar otra AD o esperar. No degrada la arquitectura.
3. **Port 25 bloqueado** de salida (email SMTP): usar Email Delivery o proveedor externo, no SMTP propio.
4. **Home region**: los recursos Always Free viven en la región "home" del tenancy.
5. Una sola cuenta Free por persona; requiere tarjeta (solo verificación, sin cargos por recursos Always Free).

---

## 3. Arquitectura objetivo (primer piloto) — monolito modular

```
Internet (HTTPS 443)
   │
Reverse Proxy (nginx en VM, Let's Encrypt)   ← puertos 80/443
   │
SaaS / Fastify (container node:22)           ← interno :3000
   │
 ├─ PostgreSQL 16 (container)                 ← interno :5432 (NO expuesto)
 └─ Redis 7 (container)                       ← interno :6379 (NO expuesto)

SSH 22 — solo clave, usuario no root `soluciona`
```

**Puertos externos**: 22, 80, 443 únicamente.
**NO exponer**: 3000, 5432, 6379, puertos de agentes.

---

## 4. Forma / Shape objetivo

```text
VM.Standard.A1.Flex
├── 2 OCPU
├── 12 GB RAM
├── Ubuntu 24.04 LTS (ARM64 / aarch64, imagen Always Free-eligible)
├── Boot volume: 50 GB (default; deja ~150 GB libres del cupo 200 GB)
└── 1 VNIC en subred pública + 1 IPv4 público (para SSH/HTTPS)
```

Docker en ARM64: confirmar que las imágenes base (`node:22`, `postgres:16`, `redis:7`, `nginx:alpine`) tienen variante multi-arch. El `Dockerfile.prod` del proyecto ya declara `platforms: linux/amd64,linux/arm64`.

---

## 5. Red y seguridad (diseño mínimo)

| Capa | Configuración |
|------|---------------|
| VCN | 1 VCN, 1 subred pública (inicial) |
| Security List ingress | 22 (SSH, desde IP admin), 80, 443 (0.0.0.0/0) |
| Security List egress | 0.0.0.0/0 (salida general; port 25 bloqueado por Oracle) |
| Firewall host | UFW: allow 22,80,443; deny all inbound else |
| SSH | clave pública del Owner; `PasswordAuthentication no` |
| Usuario | `soluciona` (no root) + sudo limitado a docker |
| Secretos | `.env` en `/opt/soluciona/env/` (chmod 600, owner soluciona); **nunca en Git/imágenes** |

---

## 6. Estructura en la VM

```text
/opt/soluciona/
├── repo/      └─ git clone del repo (rama/tag desplegado)
├── env/       └─ .env.production, certs TLS, keys (600)
├── data/      └─ postgres/, redis/, uploads/ (volúmenes)
├── backups/   └─ pg_dump diario, redis BGSAVE
├── logs/      └─ docker logs, nginx access/error, healthchecks
└── scripts/   └─ bootstrap, deploy, restore, healthcheck, rollback
```

---

## 7. Estrategia de despliegue (IaC ligero — sin Terraform en el piloto)

```
Git (main, tag vX.Y.Z)
  → CI (build imagen multi-arch → ghcr.io)
  → Oracle: docker compose pull + up -d
  → health check (/health, /ready)
```

- **Docker Compose es suficiente** para el primer piloto (no introducir Kubernetes/Terraform).
- Provisionamiento reproducible: script `infra/oracle/bootstrap-vm.sh` (via OCI CLI) + `bootstrap.sh` (usuario/docker/dirs/ufw).
- **OCI CLI**: necesario instalarla en el portátil (o usar Consola web) para FASE 6.

---

## 8. Orden de arranque (mismo que Plan Director §7 / PROCESO §7.2)

```text
Docker → PostgreSQL → verificar DB → SaaS → healthcheck → Redis → healthcheck → nginx(HTTPS) → smoke E2E
```

Tras cada servicio: `free -h`, `docker stats`, `df -h`, `docker ps`, logs.

---

## 9. Observabilidad mínima

- Endpoint `/health` (liveness) y `/ready` (readiness: DB+Redis).
- Logs JSON → stdout → `docker logs` → `/opt/soluciona/logs/`.
- Identificación de release: `/health` o `/ready` debe exponer `commit_sha`, `version`, `environment`, `deployment_timestamp` (ver PROCESO §). Pendiente: verificar si el SaaS actual lo expone.
- Cron healthcheck local → alerta (notifications/email opcional).

---

## 10. Requisitos previos a FASE 6 (provisionamiento)

1. Cuenta Oracle Cloud Free Tier del Owner (tarjeta verificación).
2. Selección de **home region** con A1 ARM disponible.
3. Clave SSH pública del Owner.
4. OCI CLI instalada/autenticada en el portátil (o usar Consola).
5. Dominio (opcional para Let's Encrypt) o self-signed temporal.

---

## 11. Decisiones pendientes (requieren Owner)

- D1. ¿Recrear staging bajo demanda (aceptar idle reclamation) vs. keep-alive?
- D2. ¿PostgreSQL self-managed (container) vs. Oracle Autonomous DB (2 Always Free)?
- D3. ¿Dominio + Let's Encrypt ahora, o IP pública + self-signed para el primer demo?
- D4. ¿Usar OCI CLI (consola de mando) vs. Consola web?

---

*Documento vivo. Actualizar al verificar disponibilidad real en la consola del tenancy.*