/**
 * Genera un certificado digital self-signed para pruebas locales (Sandbox).
 * NO usar en produccion. Para produccion, obtener .p12 de una certificadora ONAC.
 *
 * Genera: certs/firma.p12  (RSA 2048, SHA-256, pass: test1234, valido 10 anos)
 */

import forge from 'node-forge';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'certs');
const OUT_PATH = join(OUT_DIR, 'firma.p12');
const PASSWORD = 'test1234';

mkdirSync(OUT_DIR, { recursive: true });

if (writeFileSync.length === undefined) {
  // noop para que el bundler no lo elimine
}

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01' + Date.now().toString(16);
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
  { name: 'commonName', value: 'Soluciona FE Test (Sandbox)' },
  { name: 'countryName', value: 'CO' },
  { name: 'organizationName', value: 'Soluciona Inteligencia Artificial' },
  { name: 'organizationalUnitName', value: 'DIAN Software Propio' },
  { name: 'stateOrProvinceName', value: 'Bogota' },
  { name: 'localityName', value: 'Bogota' },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey, [cert], PASSWORD,
  { algorithm: '3des' },
);
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
writeFileSync(OUT_PATH, Buffer.from(p12Der, 'binary'));

console.log('[gen-test-cert] certificado generado:', OUT_PATH);
console.log('[gen-test-cert] password:', PASSWORD);
console.log('[gen-test-cert] subject:', cert.subject.getField('CN').value);
console.log('[gen-test-cert] valid until:', cert.validity.notAfter.toISOString());
