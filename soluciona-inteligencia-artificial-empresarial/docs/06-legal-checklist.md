# Checklist Legal y Empresarial — soluciona (v1.1 · Edición Colombia)

La profesionalidad empieza en el papel. Sin entidad, contrato y seguro, un solo incidente puede acabar con todo. Este documento es para operar en **Colombia (Girardot, Cundinamarca)**; valida los datos con un contador local antes de formalizar.

## 1. Etapa 1 — Forma jurídica y fiscal (Colombia)

| Paso | Qué hacer | Por qué |
|---|---|---|
| Definir si operas como **persona natural comerciante** o crear **SAS** | Persona natural: matrícula mercantil en la Cámara de Comercio (Girardot / Alto Magdalena) y RUT. SAS: se crea ante cámara (documento privado + registro), capital mínimo simbólico, puedes ser accionista único | Reputación corporativa y límite de responsabilidad patrimonial de la SAS |
| Registrar actividad económica | CIIU: **6202** (consultoría de informática), **6209** (otras actividades de TI), **6319** (procesamiento de datos / hosting) | Es la descripción del trabajo ante DIAN y Cámara |
| Obtener **NIT/RUT** ante la **DIAN** | Completo: actualización del RUT con actividad económica CIIU | Obligatorio para facturar |
| Elegir régimen de IVA | Según tamaño: régimen simplificado o común (19% IVA). Confirmar con contador | No inventar: un mal régimen sale caro en la declaración |
| Facturación electrónica | Emitir **factura electrónica DIAN** (plataformas autorizadas: e.g. Alegra, Softlo, Memoracharemos — elegir según tarifa) | Los clientes la exigen; la DIAN fiscaliza |
| Firma digital / certificado | Certificado de firma digital con calidad de producción + registro en entidad certificadas (ONAC). También trámites ante DIAN pueden hacerse con firma electrónica | Firmar contratos y declaraciones a distancia |
| Cuenta bancaria de empresa | Abrir cuenta corporativa (también neobancos) | Separación total de patrimonio |
| Registro de beneficiarios finales (RUBF) | Declarar beneficiarios finales ante la DIAN (obligatorio para persona jurídica desde 2021) | Requisito de la Vigilancia de la DIAN |

**Nota (persona natural primero)**: si hoy no te alcanza para la SAS, arranca como persona natural con matrícula mercantil y factura electrónica a tu nombre — es legal y suficiente para los primeros clientes SIMPLES; crea la SAS antes del primer contrato de cliente regulado o del momento en que el riesgo lo justifique.

## Paso 0 — Antes de firmar tu primer cliente (Colombia)

- [ ] **Tratamiento de datos personales**: adecuar a la **Ley 1581 de 2012** (protección de datos) + SIC. Tu página y formularios deben informar (autorización explícita + política de tratamiento + finalidades). No recoja más datos de los necesarios.
- [ ] **Registro de bases de datos ante la SIC** si recolectas bases con datos personales (requisito de la ley; el aviso lo presta el titular a los interesados).
- [ ] Delitos informáticos: cumple la **Ley 1273 de 2009** (penal para violadores de datos); tu funcionamientos serán auditables.
- [ ] Verificar en la Cámara de Comercio que el nombre "soluciona" esté disponible (homónimo) antes de la promoción pública.
- [ ] Póliza de manejo: cuando cotices seguros (Suramericana, Seguros Bolívar, Allianz, etc.), revisa también cláusulas de ciberprotección del mercado local.

## 2. Contratos (las 3 piezas mínimas para Colombia)

1. **MSA (Acuerdo Marco de Servicios)**
   - Objeto del servicio y alcance (qué hacemos y qué NO: exclusiones)
   - SLA (medibles, consultar docs/04) + penalizaciones proporcionales
   - Precio en COP o dólares, facturación, renegociación
   - Horarios y disponibilidad
   - Confidencialidad
   - Limitación de responsabilidad (tope en meses de facturación o monto; es práctica estándar)
   - Terminación (con y sin causa; avisos con 30 días y exclusiones)
   - Jurisdicción y mediación → incluir el **Pacto de no revelar información (NDA)** como cláusula o anexo

2. **DPA (Addendum de Protección de Datos)** — viene con MSA o separado
   - Rol: contraparte es controlador; soluciona procesador — y viceversa si también es controlador
   - Datos: qué se procesa, fines, retención, borrado
   - Obligaciones: confidencialidad, seguridad, notificación de violación en plazos (4-12h como objetivo P1)
   - Subprocesadores: lista con notificación de cambio
   - Derecho de auditoría del cliente, de forma proporcional
   - Eliminación de datos al finalizar (certificación de borrado)

3. **NDA (Acuerdo de Confidencialidad)** — y/o cláusula en MSA
   - Definición de información confidencial (amplia: incluye datos técnicos, passwords, config)
   - Deberes: no divulgar, no copiar, destrucción al finalizar
   - Duración: como mínimo 3 años y para secretos de seguridad indefinido

## 3. Seguros (antes de clientes regulados)

| Póliza | Para qué | Cuándo |
|---|---|---|
| Ciberseguro (cyber) | Fugas, ransomware, multas, aviso a víctimas | Antes del primer cliente con datos sensibles |
| Errores y Omisiones (Tech E&O) | Reclamaciones por mal servicio | Con clientes corporativos de entidad real |

Límites de póliza recomendados: empezar en 250k–500k; subir a 1M con fintech/banco; las grandes referencias pueden pedir hasta 5M–20M (escalera: no pagas hoy 10M).

## 5. Antes de la primera intervención en el cliente (checklist de paso)

- [ ] Contrato firmado (MSA + DPA) y una copia firmada y archivada
- [ ] Alcance y exclusions escritos por el cliente y aceptados
- [ ] Contactos de aprobación/emergencia del cliente definidos
- [ ] Reglas del cliente sobre soporte externo consultadas (política de seguridad del cliente)
- [ ] Nuestro procedimiento 03 leído por el cliente (firma de enterado) y su medio de acceso elegido
- [ ] Identidad legal lista para facturar (factura #1 sin errores)
- [ ] Seguro vigente entra en vigor si la hay
- [ ] Backup previo de lo que se va a tocar (o aprobación del cliente para proceder sin backup)
- [ ] Plan de incidentes y notificación leído con el cliente (docs/02, sección 8)

## 6. Facturación y dinero

- Factura siempre (incluso si el cliente "no la necesita") — es tu prueba fiscal.
- Anticipo del 50% en proyectos nuevos (pyme); el resto al entregar.
- Soporte por mensualidad (predecible) + hora de extras fuera de SLA.
- Cobro por anticipado de la mensualidad: evita sorpresas.
- Registro doble: cuaderno sencillo + hoja de cálculo o ERP simple.

## 6. Ética y límites (lo que NO hacemos)

1. **Nunca** acceder sin contrato, aun con buena intención.
2. **Nunca** guardar credenciales del cliente en claro o en nuestro entorno; seguir el procedimiento 03.
3. **Nunca** tocar datos de tarjeta/PCI (no se almacenan según política).
4. **Nunca** mentir en el dossier o cuestionario (honestidad es estrategia).
5. **Nunca** operar en el cliente en horarios fuera del contrato sin aprobación.
6. **Nunca** romper el aislamiento entre clientes (un mismo repo/Docker no se comparte).
7. **Sí** pedir ayuda: abogado on call, contador, y nuestra "red de seguridad" legal de referencia.

---

*v1.0 — 2026-08. Con la revisión de un abogado/contador local según el país.*
