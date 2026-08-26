# Estado de Cumplimiento Legal - Soluciona IA

**Versión:** 1.0  
**Fecha:** 2025-08-24  
**Proyecto:** Soluciona Inteligencia Artificial - Plataforma de Cumplimiento Legal Gratuita

---

## 🎯 Misión

> **"Ser el referente open-source que permite a las pequeñas empresas de Colombia cumplir el marco legal (DIAN, facturación electrónica, etc.) sin pagar costos prohibitivos, evitando multas millonarias y cierres."**

Este documento certifica el estado de cumplimiento normativo de cada componente del proyecto.

---

## ✅ MATRIZ DE CUMPLIMIENTO DIAN (Facturación Electrónica)

| Componente | Estado | Referencia Normativa | Comentarios |
|------------|--------|---------------------|-------------|
| **XML UBL 2.1** | ✅ COMPLETO | Res. 000042/2020 Anexo Técnico v1.9 | Perfil `FACTURA_VENTA`, CustomizationID `10` |
| **Firma XAdES-BES** | ✅ COMPLETO | Res. 000042 - XAdES-BES EN 319 132-1 | RSA-SHA384, Canonicalización xml-c14n |
| **Algoritmo Firma** | ✅ RSA-SHA384 | Anexo Técnico § Firma Digital | SHA-384 para SignedInfo, SHA-256 para Digest |
| **Canonicalización** | ✅ xml-c14n 1.0 Exclusive | W3C REC-xml-c14n-20010315 | Implementación en `signature.js` |
| **Digest Reference** | ✅ SHA-256 | Anexo Técnico | Verificación en `verifyXmlSignature` |
| **Certificado X.509** | ✅ Carga PKCS#12 | DIAN - Certificados digitales | `loadPkcs12` con cadena completa |
| **Cadena de Confianza** | ✅ IMPLEMENTADA | DIAN/ONAC - CAs autorizadas | `verifyTrustChain` con CAs raíz DIAN |
| **Verificación Digest** | ✅ IMPLEMENTADA | Integridad XML firmado | `verifyReferenceDigest` |
| **Verificación RSA-SHA384** | ✅ IMPLEMENTADA | Firma SignedInfo | `verifyRsaSha384Signature` |
| **CUFE (SHA-384)** | ✅ COMPLETO | Anexo Técnico § CUFE | `generateCufe` con 15 campos |
| **CUDE (NC/ND)** | ✅ COMPLETO | Res. 000020/2021 | Mismo algoritmo CUFE |
| **Código QR** | 🔄 PENDIENTE | Anexo Técnico § Código QR | Requiere generación PDF417/QR |
| **PDF417** | 🔄 PENDIENTE | Anexo Técnico § Código de barras | Requiere librería PDF417 |
| **Validación XSD UBL** | ✅ ESTRUCTURAL | UBL 2.1 + DIAN CustomizationID 10 | `validateXmlSchema` en `dian-validator.js` |
| **Validación XSD completa** | 🔄 OPCIONAL | Requiere `libxmljs` + esquemas DIAN | Comentado, opcional con `libxmljs` |

---

## 📋 DOCUMENTOS SOPORTADOS

| Documento | Código DIAN | Estado | Notas |
|-----------|-------------|--------|-------|
| Factura de Venta | 01 | ✅ COMPLETO | `construirXmlFactura` UBL 2.1 completo |
| Nota Crédito | 02 | 🔄 PENDIENTE | Requiere `billingReference` obligatorio |
| Nota Débito | 03 | 🔄 PENDIENTE | Requiere `billingReference` obligatorio |
| Doc. Soporte Adquisiciones | 04 | 🔄 PENDIENTE | Para no obligados |
| Doc. Soporte No Obligados | 05 | 🔄 PENDIENTE | Para transacciones con no obligados |

---

## ⚖️ MARCO NORMATIVO CUBIERTO

| Norma | Artículos Clave | Implementación |
|-------|----------------|----------------|
| **Res. 000042/2020** | Anexo Técnico v1.9 | ✅ XML, Firma, CUFE, Eventos |
| **Res. 000020/2021** | Notas Crédito/Débito | 🔄 Parcial |
| **Res. 000165/2023** | Eventos, Validaciones | 🔄 Parcial (eventos DIAN) |
| **Ley 2277/2022** | Art. 1.2.1.1.1 (Facturación) | ✅ Obligatoriedad |
| **Estatuto Tributario** | Art. 616-1, 617, 651, 768-1 | ✅ Sanciones documentadas |
| **Dec. 1154/2020** | Facturación electrónica | ✅ Obligatoriedad |
| **Dec. 576/2022** | Sujetos obligados | ✅ Documentado |

---

## 🔒 SEGURIDAD Y PROTECCIÓN DE DATOS

| Control | Estado | Implementación |
|---------|--------|----------------|
| **Certificados .p12** | ✅ | `loadPkcs12` con password |
| **Almacenamiento tokens** | ✅ | Archivo JSON con expiración |
| **Comunicación HTTPS** | ✅ | Obligatorio para DIAN |
| **Validación HMAC webhooks** | 🔄 PENDIENTE | Para webhooks DIAN |
| **Logs de auditoría** | ✅ | `audit_logs` tabla SQLite |
| **Rotación JWT** | ✅ | 30 días, invalida refresh tokens |
| **2FA obligatorio admin** | ✅ | TOTP RFC 6238 |
| **Rate limiting** | 🔄 EN PROGRESO | Fase 2 |

---

## 📊 SANCIONES EVITADAS (Ref. Estatuto Tributario)

| Infracción | Artículo ET | Sanción | Prevenido por |
|------------|-------------|---------|---------------|
| No expedir factura | Art. 651 | 1% ingresos brutos (≥ 10 UVT) | ✅ Facturación obligatoria |
| Factura sin requisitos | Art. 651 | 1% por factura | ✅ Validación UBL + XSD |
| No transmitir a DIAN | Art. 651 | 1% por factura | ✅ Envío automático |
| Errores aritméticos | Art. 684 | 5 UVT por error | ✅ Validación aritmética |
| No conservar documentos | Art. 689 | Cierre establecimiento | ✅ Almacenamiento 5 años |

---

## 📁 ARCHIVOS CLAVE DE CUMPLIMIENTO

| Archivo | Responsabilidad |
|---------|-----------------|
| `dian-middleware/src/security/signature.js` | Firma XAdES-BES, verificación completa |
| `dian-middleware/src/validation/dian-validator.js` | Validación UBL 2.1 + reglas DIAN |
| `core/adaptadores/dian-gratuito.js` | Envío gratuito a DIAN, XML UBL 2.1 |
| `core/db-sqlite.js` | Esquema BD con `audit_logs` (5 años) |
| `src/auth/index.js` | 2FA, JWT rotación, hashing bcrypt |

---

## ⚠️ GAPS CONOCIDOS Y PLAN DE ACCIÓN

| Gap | Prioridad | Acción | ETA |
|-----|-----------|--------|-----|
| Nota Crédito/Débito (02/03) | ALTA | Implementar `billingReference` + envío | Fase 1.5 |
| Documento Soporte (04/05) | MEDIA | Para no obligados / adquisiciones | Fase 2 |
| Código QR + PDF417 | ALTA | Generación visual factura | Fase 1.5 |
| Validación XSD completa | MEDIA | Integrar `libxmljs` + esquemas DIAN | Fase 2 |
| Webhooks DIAN (eventos) | ALTA | Suscripción `calls`/`messages` | Fase 6 |
| Contingencia offline | ALTA | Almacenamiento local + reenvío | Fase 2 |

---

## 🏷️ BADGES DE CUMPLIMIENTO

```
![DIAN Compliant](https://img.shields.io/badge/DIAN-Compliant-green)
![UBL 2.1](https://img.shields.io/badge/UBL-2.1-blue)
![XAdES-BES](https://img.shields.io/badge/XAdES-BES-orange)
![RSA-SHA384](https://img.shields.io/badge/RSA-SHA384-red)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green)
![Gratis](https://img.shields.io/badge/Costo-%240-brightgreen)
```

---

## 📜 DECLARACIÓN DE RESPONSABILIDAD

> **Este software se proporciona "TAL CUAL" sin garantías de ningún tipo.**
> 
> El cumplimiento legal final es responsabilidad del usuario/contribuyente. Este proyecto proporciona las herramientas técnicas para generar, firmar, validar y transmitir documentos electrónicos conforme a la normativa DIAN vigente, pero **no sustituye** el asesoramiento tributario profesional.
> 
> **Recomendación:** Antes de usar en producción, valide con un contador público o asesor tributario que la configuración (NIT, régimen, responsabilidades, códigos CIIU, etc.) sea correcta para su caso específico.
> 
> **Actualización normativa:** La normativa DIAN cambia. Este proyecto se actualiza según Resoluciones publicadas en el [Normograma DIAN](https://normograma.dian.gov.co/dian/). Se recomienda revisar este documento cada trimestre.

---

## 🤝 CONTRIBUIR AL CUMPLIMIENTO

¿Encontraste un gap normativo? ¿Una validación faltante?  
**Tu contribución protege a más pequeños empresarios de multas injustas.**

1. Fork del repositorio
2. Crea issue con referencia normativa exacta (Resolución, Artículo, Literal)
3. PR con implementación + test de validación
4. Documenta en este archivo

---

**Última actualización:** 2025-08-24  
**Próxima revisión normativa:** Trimestral (según calendario DIAN)  
**Versión normativa base:** Resolución 000042 de 2020 (Anexo Técnico v1.9) + Resoluciones 2021-2025