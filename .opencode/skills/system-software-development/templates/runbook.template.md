# Runbook Template

## Formato: `docs/runbooks/<feature>-<action>.md`

---

# Runbook: <Nombre de la Operación>

**Servicio**: <Nombre del servicio/módulo>
**Criticidad**: Baja | Media | Alta | Crítica
**Frecuencia**: Bajo demanda | Diario | Semanal | Mensual | Emergencia
**Autor**: <Nombre>
**Revisado**: YYYY-MM-DD
**Próxima Revisión**: YYYY-MM-DD

---

## 1. Resumen

<Descripción breve de qué hace este runbook, cuándo usarlo, y qué resultado se espera.>

**Objetivo**: <Qué se logra al completar este runbook>
**Tiempo Estimado**: <X minutos/horas>
**Requiere Aprobación**: Sí/No (si sí, quién: <Rol>)

---

## 2. Prerrequisitos

### Accesos Requeridos
| Sistema | Rol/Permiso | Cómo Obtener |
|---------|-------------|--------------|
| Kubernetes (prod) | `admin` namespace | Solicitar a Platform Team |
| Base de Datos | `readwrite` en schema | Vault: `db/credentials/prod` |
| GitHub | `write` en repo | Equipo de desarrollo |
| Monitoring (Grafana) | `editor` | Auto-provisionado |

### Herramientas
- `kubectl` v1.28+ configurado para cluster correcto
- `psql` v16+ / `redis-cli` v7+
- `jq` para JSON parsing
- Acceso a 1Password/Vault para secretos

### Verificaciones Previas
- [ ] Verificar ventana de mantenimiento (si aplica)
- [ ] Confirmar backup reciente (< 24h)
- [ ] Notificar a stakeholders (Slack #ops, email)
- [ ] Verificar que no hay deployments en curso

---

## 3. Procedimiento Paso a Paso

### Paso 1: <Nombre del Paso>
**Descripción**: <Qué se hace>
**Comando**:
```bash
# Comando exacto a ejecutar
kubectl -n soluciona-prod get pods -l app=soluciona-api
```
**Resultado Esperado**: <Qué debe mostrar el comando>
**Validación**: `grep -q "Running" <<< "$OUTPUT"`

### Paso 2: <Nombre del Paso>
**Descripción**: <Qué se hace>
**Comando**:
```bash
# Comando con variables
export TENANT_ID="cli-abc123"
psql "$DATABASE_URL" -c "SELECT * FROM tenants WHERE id = '$TENANT_ID';"
```
**Resultado Esperado**: <Output esperado>
**Rollback si Falla**: <Comando para revertir>

### Paso N: Verificación Post-Ejecución
**Comandos de Validación**:
```bash
# Health check
curl -sf https://api.soluciona.ai/health/ready

# Métricas clave
curl -sf https://prometheus.soluciona.ai/api/v1/query?query=up{job=\"soluciona-api\"}

# Logs recientes
kubectl -n soluciona-prod logs -l app=soluciona-api --since=5m | grep -i error
```

**Criterios de Éxito**:
- [ ] Health check retorna 200 OK
- [ ] Métricas muestran 100% up
- [ ] 0 errores en logs últimos 5 min
- [ ] Funcionalidad verificada manualmente (si aplica)

---

## 4. Rollback / Plan de Contingencia

### Cuándo Hacer Rollback
- Health check falla por > 5 min
- Error rate > 1% sostenido por 10 min
- Latencia P95 > 2x baseline por 15 min
- Funcionalidad crítica rota (reportada por usuarios)

### Procedimiento de Rollback
```bash
# 1. Rollback deployment (ArgoCD)
argocd app rollback soluciona-api <PREVIOUS_VERSION>

# 2. O manual (kubectl)
kubectl -n soluciona-prod rollout undo deployment/soluciona-api

# 3. Verificar rollback
kubectl -n soluciona-prod rollout status deployment/soluciona-api --timeout=5m

# 4. Validar salud
curl -sf https://api.soluciona.ai/health/ready
```

### Contactos de Escalación
| Nivel | Nombre | Contacto | Disponibilidad |
|-------|--------|----------|----------------|
| L1 (On-call) | <Nombre> | Tel/Slack | 24/7 |
| L2 (Tech Lead) | <Nombre> | Tel/Slack | Horario laboral |
| L3 (Platform) | <Nombre> | Tel/Slack | 24/7 |

---

## 5. Troubleshooting Común

| Síntoma | Causa Probable | Acción |
|---------|----------------|--------|
| Pods en `CrashLoopBackOff` | Config error / Secret faltante | `kubectl describe pod <pod>` → revisar events |
| DB connection pool exhausted | Leak de conexiones / query lenta | `pg_stat_activity` → kill queries largas |
| High latency P99 | GC pressure / DB lock | Revisar logs GC + `pg_locks` |
| 503 Service Unavailable | Deployment en progreso / HPA scaling | Esperar 2-3 min, verificar HPA |
| Certificado TLS expirado | Renovación automática falló | `cert-manager` logs → renovar manual |

---

## 6. Post-Mortem (Si Hubo Incidente)

**Incidente Relacionado**: INC-YYYY-MM-DD-<ID>
**Causa Raíz**: <Resumen>
**Acciones Preventivas**: <Lista>

---

## 7. Referencias

- Arquitectura: `docs/architecture/<tema>.md`
- ADR: ADR-<NNN>
- SPEC: SPEC-<ID>
- Dashboard: `https://grafana.soluciona.ai/d/<dashboard-id>`
- Alertas: `https://alertmanager.soluciona.ai/#/alerts`
- Docs Externas: <Links a docs de proveedores>

---

## 8. Checklist de Ejecución (Para Auditoría)

| Paso | Ejecutado Por | Timestamp | Resultado | Notas |
|------|---------------|-----------|-----------|-------|
| 1. Verificaciones previas | | | ✅/❌ | |
| 2. Paso 1 | | | ✅/❌ | |
| 3. Paso 2 | | | ✅/❌ | |
| ... | | | | |
| N. Validación final | | | ✅/❌ | |

**Firma Responsable**: _________________ **Fecha**: _________

**Aprobación (si requiere)**: _________________ **Fecha**: _________