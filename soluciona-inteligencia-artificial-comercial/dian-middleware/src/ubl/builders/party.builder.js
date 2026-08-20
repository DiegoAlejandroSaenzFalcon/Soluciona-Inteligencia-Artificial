/**
 * Builder para Parties (Supplier, Customer) según UBL 2.1 y DIAN
 */

import { escapeXml } from '../../utils/xml.utils.js';

/**
 * Construye el bloque AccountingSupplierParty (Facturador/Emisor)
 * @param {Object} party - Datos del emisor
 * @returns {string} XML del AccountingSupplierParty
 */
export function buildAccountingSupplierParty(party) {
  const {
    identification,
    dv,
    name,
    tipoIdentificacion = '31',
    direccion,
    municipio,
    departamento,
    codigoPostal,
    telefono,
    email,
    responsabilidadFiscal = ['O-13', 'O-14', 'O-15'],
    regimenFiscal = 'Régimen Común'
  } = party;

  let respFiscal = '';
  for (const resp of responsabilidadFiscal) {
    respFiscal += `
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>${resp}</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`;
  }

  return `
    <cac:AccountingSupplierParty>
      <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="${tipoIdentificacion}">${identification}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PartyName>
          <cbc:Name>${escapeXml(name)}</cbc:Name>
        </cac:PartyName>
        <cac:PhysicalLocation>
          <cac:Address>
            <cbc:ID schemeID="${municipio}">${municipio}</cbc:ID>
            <cbc:CityName>${escapeXml(municipio)}</cbc:CityName>
            <cbc:PostalZone>${codigoPostal}</cbc:PostalZone>
            <cbc:CountrySubentity>${departamento}</cbc:CountrySubentity>
            <cbc:AddressLine>${escapeXml(direccion)}</cbc:AddressLine>
            <cac:Country>
              <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            </cac:Country>
          </cac:Address>
        </cac:PhysicalLocation>
        <cac:PartyTaxScheme>
          <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
          <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>
        ${respFiscal}
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
          <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
          <cac:CorporateRegistrationScheme>
            <cbc:ID>${identification}</cbc:ID>
          </cac:CorporateRegistrationScheme>
        </cac:PartyLegalEntity>
        <cac:Contact>
          <cbc:Telephone>${telefono}</cbc:Telephone>
          <cbc:ElectronicMail>${email}</cbc:ElectronicMail>
        </cac:Contact>
      </cac:Party>
    </cac:AccountingSupplierParty>`;
}

/**
 * Construye el bloque AccountingCustomerParty (Adquiriente/Cliente)
 * @param {Object} party - Datos del cliente
 * @returns {string} XML del AccountingCustomerParty
 */
export function buildAccountingCustomerParty(party) {
  const {
    identification,
    dv = '',
    name,
    tipoIdentificacion = '31',
    direccion = '',
    municipio = '11001',
    departamento = '11',
    codigoPostal = '110111',
    telefono = '',
    email = '',
    responsabilidadFiscal = [],
    regimenFiscal = ''
  } = party;

  let respFiscal = '';
  if (responsabilidadFiscal.length > 0) {
    for (const resp of responsabilidadFiscal) {
      respFiscal += `
        <cac:PartyTaxScheme>
          <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
          <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>${resp}</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>`;
    }
  }

  return `
    <cac:AccountingCustomerParty>
      <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="${tipoIdentificacion}">${identification}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PartyName>
          <cbc:Name>${escapeXml(name)}</cbc:Name>
        </cac:PartyName>
        <cac:PhysicalLocation>
          <cac:Address>
            <cbc:ID schemeID="${municipio}">${municipio}</cbc:ID>
            <cbc:CityName>${escapeXml(municipio)}</cbc:CityName>
            <cbc:PostalZone>${codigoPostal}</cbc:PostalZone>
            <cbc:CountrySubentity>${departamento}</cbc:CountrySubentity>
            <cbc:AddressLine>${escapeXml(direccion || 'Sin dirección')}</cbc:AddressLine>
            <cac:Country>
              <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            </cac:Country>
          </cac:Address>
        </cac:PhysicalLocation>
        <cac:PartyTaxScheme>
          <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
          <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>
        ${respFiscal}
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(name)}</cbc:RegistrationName>
          <cbc:CompanyID schemeID="${tipoIdentificacion}">${identification}</cbc:CompanyID>
        </cac:PartyLegalEntity>
        <cac:Contact>
          <cbc:Telephone>${telefono}</cbc:Telephone>
          <cbc:ElectronicMail>${email}</cbc:ElectronicMail>
        </cac:Contact>
      </cac:Party>
    </cac:AccountingCustomerParty>`;
}

/**
 * Construye un bloque Party genérico (para referencias)
 * @param {Object} party - Datos de la party
 * @param {string} schemeID - Esquema identificación
 * @returns {string} XML Party
 */
export function buildParty(party, schemeID = '31') {
  const { identification, name } = party;
  return `
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${schemeID}">${identification}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(name)}</cbc:Name>
      </cac:PartyName>
    </cac:Party>`;
}

export default {
  buildAccountingSupplierParty,
  buildAccountingCustomerParty,
  buildParty
};