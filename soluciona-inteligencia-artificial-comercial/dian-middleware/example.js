/**
 * Ejemplo de uso completo DIAN Middleware
 * Copiar a example.js y ejecutar: node example.js
 */

import { createDianMiddleware, runHabilitacion } from './src/index.js';

async function ejemploFactura() {
  console.log('=== EJEMPLO: Factura de Venta ===\n');

  const dian = createDianMiddleware();

  try {
    // Datos de la factura
    const factura = {
      id: 'SETP0000000001',
      issueDate: '2024-01-15',
      issueTime: '14:30:00',
      invoiceTypeCode: '01',
      documentCurrencyCode: 'COP',

      // Emisor (se toma de config automáticamente, pero se puede sobrescribir)
      supplier: {
        identification: '900123456',
        dv: '1',
        name: 'Mi Empresa SAS',
        tipoIdentificacion: '31',
        direccion: 'Calle 123 #45-67',
        municipio: '11001',
        departamento: '11',
        codigoPostal: '110111',
        telefono: '6012345678',
        email: 'facturacion@miempresa.com',
        responsabilidadFiscal: ['O-13', 'O-14', 'O-15'],
        regimenFiscal: 'Régimen Común'
      },

      // Adquiriente
      customer: {
        identification: '800123456',
        dv: '2',
        name: 'Cliente Ejemplo SAS',
        tipoIdentificacion: '31',
        direccion: 'Carrera 45 #67-89',
        municipio: '11001',
        departamento: '11',
        codigoPostal: '110111',
        telefono: '6018765432',
        email: 'cliente@ejemplo.com',
        tipoIdentificacion: '31'
      },

      // Líneas de factura
      lines: [
        {
          lineNumber: 1,
          itemCode: 'PROD001',
          description: 'Laptop Gaming 15"',
          quantity: 1,
          unitCode: '94', // Unidad (UN/ECE 94)
          unitPrice: 3500000,
          lineExtensionAmount: 3500000,
          taxRate: 19,
          taxAmount: 665000,
          taxId: '01', // IVA
          codigoProducto: 'LAP-GAM-15'
        },
        {
          lineNumber: 2,
          itemCode: 'PROD002',
          description: 'Mouse Inalámbrico',
          quantity: 2,
          unitCode: '94',
          unitPrice: 85000,
          lineExtensionAmount: 170000,
          taxRate: 19,
          taxAmount: 32300,
          taxId: '01',
          codigoProducto: 'MOUSE-WL'
        },
        {
          lineNumber: 3,
          itemCode: 'SERV001',
          description: 'Garantía Extendida 2 años',
          quantity: 1,
          unitCode: '94',
          unitPrice: 250000,
          lineExtensionAmount: 250000,
          taxRate: 19,
          taxAmount: 47500,
          taxId: '01',
          codigoProducto: 'GARANTIA-2Y'
        }
      ],

      // Descuentos/Cargos globales (opcional)
      allowancesCharges: [
        {
          chargeIndicator: false, // false=descuento, true=cargo
          allowanceChargeReason: 'Descuento cliente frecuente',
          amount: 50000,
          baseAmount: 3920000
        }
      ],

      // Observaciones
      note: 'Factura generada por sistema DIAN Middleware. Garantía 1 año incluida.',

      // Referencias (opcional)
      orderReference: {
        id: 'ORD-2024-001',
        issueDate: '2024-01-10'
      }
    };

    console.log('Procesando factura...');
    const resultado = await dian.processInvoice(factura, {
      submit: false,        // false = solo generar local, true = enviar a DIAN
      generatePdf: true     // Generar PDF con QR
    });

    console.log('\n✅ Factura procesada exitosamente');
    console.log('ID:', resultado.id);
    console.log('CUFE:', resultado.cufe);
    console.log('Estado DIAN:', resultado.dianResponse.status);
    console.log('PDF generado:', resultado.pdf ? 'Sí (' + resultado.pdf.length + ' bytes)' : 'No');

    if (resultado.validationWarnings.length > 0) {
      console.log('\n⚠️ Advertencias:', resultado.validationWarnings);
    }

    // Guardar archivos
    const fs = await import('fs');
    await fs.promises.writeFile(`factura_${resultado.id}.xml`, resultado.xml);
    if (resultado.pdf) {
      await fs.promises.writeFile(`factura_${resultado.id}.pdf`, resultado.pdf);
    }
    console.log('\n📁 Archivos guardados: factura_${resultado.id}.xml y .pdf');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function ejemploNotaCredito() {
  console.log('\n=== EJEMPLO: Nota Crédito ===\n');

  const dian = createDianMiddleware();

  try {
    const nc = {
      id: 'SETP0000001001',
      issueDate: '2024-01-16',
      issueTime: '10:00:00',
      noteTypeCode: '1', // 1=Devolución, 2=Descuento, 3=Rebaja, 4=Anulación
      documentCurrencyCode: 'COP',
      supplier: {
        identification: '900123456',
        dv: '1',
        name: 'Mi Empresa SAS',
        tipoIdentificacion: '31',
        direccion: 'Calle 123 #45-67',
        municipio: '11001',
        departamento: '11',
        codigoPostal: '110111',
        telefono: '6012345678',
        email: 'facturacion@miempresa.com'
      },
      customer: {
        identification: '800123456',
        dv: '2',
        name: 'Cliente Ejemplo SAS',
        tipoIdentificacion: '31',
        direccion: 'Carrera 45 #67-89',
        municipio: '11001',
        departamento: '11',
        codigoPostal: '110111',
        telefono: '6018765432',
        email: 'cliente@ejemplo.com'
      },
      lines: [
        {
          lineNumber: 1,
          itemCode: 'PROD001',
          description: 'Laptop Gaming 15" (Devolución)',
          quantity: 1,
          unitCode: '94',
          unitPrice: 3500000,
          lineExtensionAmount: 3500000,
          taxRate: 19,
          taxAmount: 665000,
          taxId: '01'
        }
      ],
      reason: 'Devolución por producto defectuoso',
      reasonCode: '1',
      billingReference: {
        id: 'SETP0000000001', // Factura original
        uuid: 'CUFE_DE_LA_FACTURA_ORIGINAL',
        issueDate: '2024-01-15'
      },
      note: 'Nota crédito por devolución producto defectuoso'
    };

    const resultado = await dian.processCreditNote(nc, { submit: false, generatePdf: true });

    console.log('✅ Nota Crédito procesada');
    console.log('ID:', resultado.id);
    console.log('CUDE:', resultado.cude);

  } catch (error) {
    console.error('❌ Error NC:', error.message);
  }
}

async function ejemploHabilitacion() {
  console.log('\n=== EJEMPLO: Proceso Habilitación ===\n');

  try {
    // Modos de operación (según Resolución 000042 / Anexo Técnico):
    // - 'software-propio': 60F + 20NC + 20ND (default)
    // - 'proveedor-tecnologico': 6F + 2NC + 2ND
    // - 'facturacion-gratuita': 2F + 1NC + 1ND
    const modo = 'software-propio';
    const reporte = await runHabilitacion({
      mode: modo,          // <-- modo de operación
      submit: false,       // Enviar a DIAN al finalizar (requiere credenciales reales)
      templates: {
        // Opcional: personalizar plantillas
      }
    });

    console.log('\n📊 Reporte Habilitación:');
    console.log('Modo:', reporte.summary.mode, '(' + reporte.summary.modeLabel + ')');
    console.log('Facturas:', reporte.summary.invoices);
    console.log('Notas Crédito:', reporte.summary.creditNotes);
    console.log('Notas Débito:', reporte.summary.debitNotes);
    console.log('Total:', reporte.summary.total);

    if (reporte.validation.valid) {
      console.log('✅ Set de habilitación válido para envío a DIAN');
    } else {
      console.log('❌ Errores:', reporte.validation.errors);
    }

  } catch (error) {
    console.error('❌ Error habilitación:', error.message);
  }
}

// Ejecutar ejemplos
async function main() {
  console.log('🚀 DIAN Middleware - Ejemplos de Uso\n');

  await ejemploFactura();
  await ejemploNotaCredito();

  // Descomentar para ejecutar habilitación (requiere certificado y credenciales DIAN)
  // await ejemploHabilitacion();

  console.log('\n✨ Ejemplos completados');
}

main().catch(console.error);