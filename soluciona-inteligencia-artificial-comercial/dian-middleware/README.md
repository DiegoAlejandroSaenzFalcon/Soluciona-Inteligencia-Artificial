# DIAN Middleware - Facturación Electrónica Colombia

Middleware completo para facturación electrónica DIAN bajo modalidad **Software Propio** (Desarrollo a la medida).

## Características

- ✅ **UBL 2.1** completo: Invoice, CreditNote, DebitNote
- ✅ **Firma Digital X.509**: Certificados PKCS#12, SHA-384 CUFE/CUDE, XML-DSig
- ✅ **SOAP 1.2 + WS-Security**: Cliente para Web Services DIAN (WSDL 1.1)
- ✅ **Validaciones DIAN**: Aritméticas, estructura, reglas Anexo Técnico 1.9
- ✅ **PDF con QR**: Representación gráfica obligatoria
- ✅ **Habilitación DIAN**: Set de pruebas 60F + 20NC + 20ND
- ✅ **TypeScript/JSDoc**: Tipado completo

## Instalación

```bash
cd dian-middleware
npm install
```

## Configuración

Crear archivo `.env` en la raíz del proyecto:

```env
# Identificación Facturador
DIAN_NIT=900123456
DIAN_DV=1
DIAN_RAZON_SOCIAL="Mi Empresa SAS"
DIAN_NOMBRE_COMERCIAL="Mi Empresa"
DIAN_DIRECCION="Calle 123 #45-67"
DIAN_MUNICIPIO=11001
DIAN_DEPARTAMENTO=11
DIAN_CODIGO_POSTAL=110111
DIAN_TELEFONO=6012345678
DIAN_EMAIL=facturacion@miempresa.com

# Responsabilidades fiscales
DIAN_RESPONSABILIDAD_FISCAL=O-13,O-14,O-15
DIAN_REGIMEN_FISCAL="Régimen Común"

# Ambiente y certificados
DIAN_AMBIENTE=habilitacion  # habilitacion | produccion
DIAN_CERT_PATH=./certs/firma.p12
DIAN_CERT_PASS=tu_password_certificado

# Credenciales DIAN (portal desarrolladores)
DIAN_CODIGO_SOFTWARE=tu_codigo_software
DIAN_PIN_SOFTWARE=tu_pin_software

# Numeración autorizada (resolución DIAN)
DIAN_PREFIJO=SETP
DIAN_RESOLUCION_NUMERO=123456789
DIAN_RESOLUCION_FECHA=2024-01-15
DIAN_RESOLUCION_PREFIJO=1
DIAN_RESOLUCION_DESDE=1
DIAN_RESOLUCION_HASTA=10000

# Timeouts
DIAN_TIMEOUT=30000
```

## Uso Básico

```javascript
import { createDianMiddleware } from './src/index.js';

const dian = createDianMiddleware();

// Procesar factura completa
const resultado = await dian.processInvoice({
  id: 'SETP0000000001',
  issueDate: '2024-01-15',
  issueTime: '14:30:00',
  invoiceTypeCode: '01',
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
    email: 'facturacion@miempresa.com',
    responsabilidadFiscal: ['O-13', 'O-14', 'O-15'],
    regimenFiscal: 'Régimen Común'
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
    email: 'cliente@ejemplo.com',
    tipoIdentificacion: '31'
  },
  lines: [
    {
      lineNumber: 1,
      itemCode: 'PROD001',
      description: 'Producto A',
      quantity: 2,
      unitCode: '94',
      unitPrice: 50000,
      lineExtensionAmount: 100000,
      taxRate: 19,
      taxAmount: 19000,
      taxId: '01'
    }
  ]
}, {
  submit: true,      // Enviar a DIAN
  generatePdf: true  // Generar PDF con QR
});

console.log('CUFE:', resultado.cufe);
console.log('Estado DIAN:', resultado.dianResponse.status);
```

## Estructura del Proyecto

```
dian-middleware/
├── src/
│   ├── index.js                 # Punto de entrada principal
│   ├── config/
│   │   └── dian.config.js       # Configuración centralizada
│   ├── ubl/                     # Generadores UBL 2.1
│   │   ├── index.js
│   │   ├── namespaces.js        # Namespaces UBL/DIAN
│   │   └── builders/
│   │       ├── party.builder.js     # Emisor/Adquiriente
│   │       ├── tax.builder.js       # Tributos (IVA, ICA, Consumo)
│   │       ├── line.builder.js      # Líneas de factura
│   │       └── invoice.builder.js   # Invoice, CreditNote, DebitNote
│   ├── security/
│   │   └── signature.js           # Firma digital, CUFE/CUDE, XML-DSig
│   ├── soap/
│   │   └── dian-client.js         # Cliente SOAP 1.2 + WS-Security
│   ├── validation/
│   │   └── dian-validator.js      # Validaciones Anexo 1.9
│   ├── pdf/
│   │   └── generator.js           # PDF con QR DIAN
│   ├── habilitacion/
│   │   └── manager.js             # Set pruebas 60F+20NC+20ND
│   ├── utils/
│   │   └── xml.utils.js           # Utilidades XML/XPath
│   └── types/
│       └── dian.types.js          # Tipos JSDoc
├── certs/                         # Certificados .p12 (no versionar)
├── habilitacion-output/           # Salida proceso habilitación
└── test-sets/                     # Sets de prueba
```

## Proceso de Habilitación DIAN

```javascript
import { runHabilitacion } from './src/index.js';

// Genera y envía set completo: 60 Facturas + 20 NC + 20 ND
const reporte = await runHabilitacion({
  submit: true,  // Enviar a DIAN automáticamente
  templates: {
    // Opcional: templates personalizados
  }
});

console.log('Habilitación completada:', reporte.summary);
```

## Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Ejecutar habilitación completa
npm run habilitacion

# Generar PDF de prueba
npm run generate-pdf

# Firmar XML de prueba
npm run sign-xml

# Tests
npm test
```

## Tipos de Documento Soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Factura Venta | 01 | Invoice (UBL) |
| Factura Exportación | 02 | Invoice |
| Nota Crédito | 02 | CreditNote |
| Nota Débito | 03 | DebitNote |

## Validaciones Implementadas

- ✅ Estructura UBL 2.1 obligatoria
- ✅ Validaciones aritméticas (subtotales, IVA, totales)
- ✅ Validaciones de partes (emisor, adquiriente)
- ✅ Validaciones de líneas (cantidades, precios, IVA)
- ✅ Validaciones de fechas y numeración
- ✅ Validaciones de referencias (NC/ND)
- ✅ Validaciones de tributos (IVA 0%, 5%, 19%)

## Certificados Digitales

1. Obtener certificado de entidad acreditada ONAC
2. Exportar como `.p12` con clave privada
3. Colocar en `./certs/firma.p12`
4. Configurar `DIAN_CERT_PASS` en `.env`

## Endpoints DIAN

| Ambiente | WSDL | Endpoint |
|----------|------|----------|
| Habilitación | `https://facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura?wsdl` | `https://facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura` |
| Producción | `https://facturaelectronica.dian.gov.co/ws/ReciboFactura?wsdl` | `https://facturaelectronica.dian.gov.co/ws/ReciboFactura` |

## Notas Importantes

1. **Numeración**: Usar rangos autorizados por resolución DIAN
2. **CUFE/CUDE**: Generado automáticamente con SHA-384 según algoritmo DIAN
3. **QR Code**: Generado automáticamente en PDF con datos DIAN
4. **Contingencia**: Implementar según resolución (tipo 0=Normal, 1=Contingencia)
5. **Almacenamiento**: Guardar XML firmado + PDF + respuesta DIAN mínimo 5 años

## Licencia

MIT - Para uso comercial y educativo.