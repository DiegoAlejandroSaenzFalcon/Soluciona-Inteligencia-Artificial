#!/usr/bin/env node
/**
 * Spec Validation Script
 * Valida que una spec cumpla con el formato requerido
 * Uso: node scripts/validate-spec.js <spec-file.md>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_SECTIONS = [
  '## 1. Contexto y Justificación',
  '## 2. Actores y Permisos',
  '## 3. Especificación Formal (Given/When/Then)',
  '## 4. Criterios de Aceptación (AC)',
  '## 5. Casos Edge y Errores',
  '## 6. Requisitos No Funcionales (NFRs)',
  '## 7. Trazabilidad',
  '## 8. Estimación y Planificación',
  '## 9. Riesgos y Mitigación',
];

const REQUIRED_GWT = ['Given', 'When', 'Then'];
const AC_PATTERN = /\| AC-\d+ \|/;
const TRACEABILITY_FIELDS = [
  'Tests Unitarios',
  'Tests Integración',
  'Tests E2E',
  'Código Domain',
  'Código Application',
  'Código Infrastructure',
  'Código Interfaces',
];

function validateSpec(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];

  // 1. Verificar secciones requeridas
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Falta sección requerida: ${section}`);
    }
  }

  // 2. Verificar formato Given/When/Then en sección 3
  const gwtSection = content.split('## 3. Especificación Formal')[1]?.split('## 4.')[0] || '';
  for (const keyword of REQUIRED_GWT) {
    if (!gwtSection.includes(`#### ${keyword}`) && !gwtSection.includes(`### ${keyword}`)) {
      warnings.push(`Sección 3: No se encontró bloque "${keyword}" (puede usar formato Gherkin)`);
    }
  }

  // 3. Verificar Criterios de Aceptación (tabla con AC-IDs)
  const acMatches = content.match(/(\| AC-\d+ \|.*?\|)/g);
  if (!acMatches || acMatches.length < 3) {
    errors.push('Criterios de Aceptación: Se requieren al menos 3 ACs en formato tabla (| AC-1 | ... |)');
  } else {
    // Validar cada AC tiene campos requeridos
    for (const ac of acMatches) {
      const cols = ac.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length < 5) {
        warnings.push(`AC formato incompleto: ${ac} (esperado: | AC-ID | Descripción | Tipo | Prioridad | Automatizado |)`);
      }
    }
  }

  // 4. Verificar trazabilidad
  const traceSection = content.split('## 7. Trazabilidad')[1]?.split('## 8.')[0] || '';
  for (const field of TRACEABILITY_FIELDS) {
    if (!traceSection.includes(field)) {
      warnings.push(`Trazabilidad: Falta campo "${field}"`);
    }
  }

  // 5. Verificar Casos Edge (sección 5)
  const edgeSection = content.split('## 5. Casos Edge')[1]?.split('## 6.')[0] || '';
  const edgeCount = (edgeSection.match(/\| E-\d+ \|/g) || []).length;
  if (edgeCount < 5) {
    warnings.push(`Casos Edge: Solo ${edgeCount} casos (recomendado mínimo 8-10)`);
  }

  // 6. Verificar NFRs (sección 6)
  const nfrSection = content.split('## 6. Requisitos No Funcionales')[1]?.split('## 7.')[0] || '';
  const nfrCategories = ['Performance', 'Seguridad', 'Observabilidad', 'Disponibilidad'];
  for (const cat of nfrCategories) {
    if (!nfrSection.includes(cat)) {
      warnings.push(`NFRs: Falta categoría "${cat}"`);
    }
  }

  // 7. Verificar metadata en cabecera
  const headerFields = ['ID', 'Estado', 'Versión', 'Fecha', 'Autor', 'Aprobador PO', 'Prioridad', 'Variante', 'Módulo'];
  for (const field of headerFields) {
    const regex = new RegExp(`\\*\\*${field}\\*:`);
    if (!regex.test(content)) {
      warnings.push(`Cabecera: Falta campo "**${field}:**"`);
    }
  }

  // Resultado
  console.log('\n═══════════════════════════════════════');
  console.log(`VALIDACIÓN SPEC: ${filePath}`);
  console.log('═══════════════════════════════════════\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ SPEC VÁLIDA - Cumple todos los requisitos\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log('❌ ERRORES (bloqueantes):');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS (recomendado corregir):');
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
    console.log('');
  }

  console.log('═══════════════════════════════════════\n');

  process.exit(errors.length > 0 ? 1 : 0);
}

// CLI
const filePath = process.argv[2];
if (!filePath) {
  console.error('Uso: node validate-spec.js <spec-file.md>');
  process.exit(1);
}

validateSpec(resolve(filePath));