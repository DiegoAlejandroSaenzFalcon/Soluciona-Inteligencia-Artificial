import { describe, it, expect } from 'vitest';
import { generateCufe, extractCufeParams } from '../../dian-middleware/src/security/signature.js';

describe('DIAN - CUFE Generation', () => {
  it('should generate valid CUFE (96 chars hex)', () => {
    const params = {
      numFac: 'SETP123',
      fecFac: '20240115',
      horFac: '143000',
      valFac: '1000000',
      codImp1: '01',
      valImp1: '190000',
      codImp2: '',
      valImp2: '0',
      codImp3: '',
      valImp3: '0',
      valTot: '1190000',
      nitOfe: '900123456',
      numAdq: '800123456',
      clTec: 'ABC123',
      tipoAmbiente: '2'
    };
    const cufe = generateCufe(params);
    expect(cufe).toBeDefined();
    expect(cufe.length).toBe(96);
    expect(cufe).toMatch(/^[A-F0-9]{96}$/);
    expect(cufe).toBe(cufe.toUpperCase());
  });

  it('should generate consistent CUFE for same params', () => {
    const params = {
      numFac: 'SETP456',
      fecFac: '20240220',
      horFac: '100000',
      valFac: '500000',
      codImp1: '01',
      valImp1: '95000',
      codImp2: '',
      valImp2: '0',
      codImp3: '',
      valImp3: '0',
      valTot: '595000',
      nitOfe: '900123456',
      numAdq: '800123456',
      clTec: 'XYZ789',
      tipoAmbiente: '2'
    };
    const cufe1 = generateCufe(params);
    const cufe2 = generateCufe(params);
    expect(cufe1).toBe(cufe2);
  });

  it('should throw on missing required params', () => {
    const params = {
      numFac: 'SETP123',
      fecFac: '20240115',
      // missing required params
    };
    expect(() => generateCufe(params)).toThrow('Parametro obligatorio para CUFE faltante');
  });
});

describe('DIAN - CUFE Params Extraction', () => {
  it('should extract params from invoice data', () => {
    const invoiceData = {
      id: 'SETP789',
      issueDate: '2024-03-10',
      issueTime: '15:30:00',
      legalMonetaryTotal: {
        lineExtensionAmount: 200000,
        payableAmount: 238000
      },
      taxTotals: [
        {
          taxSubtotals: [
            { taxCategory: { taxScheme: { id: '01' } }, taxAmount: 38000, percent: 19 }
          ]
        }
      ],
      supplier: { identification: '900123456' },
      customer: { identification: '800123456' },
      tipoAmbiente: '2'
    };
    const params = extractCufeParams(invoiceData);
    expect(params.numFac).toBe('SETP789');
    expect(params.fecFac).toBe('2024-03-10');
    expect(params.horFac).toBe('15:30:00');
    expect(params.valFac).toBe(200000);
    expect(params.codImp1).toBe('01');
    expect(params.valImp1).toBe(38000);
    expect(params.valTot).toBe(238000);
    expect(params.nitOfe).toBe('900123456');
    expect(params.numAdq).toBe('800123456');
    expect(params.tipoAmbiente).toBe('2');
  });
});