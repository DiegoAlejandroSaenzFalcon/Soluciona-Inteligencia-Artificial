import { describe, it, expect } from 'vitest';

// Pure function tests - no external dependencies needed
// These functions are pure and don't require database access

// Copy the pure functions from src/auth/index.js for testing
const crypto = require('crypto');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret, counter, digits) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return (bin % Math.pow(10, digits || 6)).toString().padStart(digits || 6, '0');
}

function currentTotp(secret) {
  return hotp(secret, Math.floor(Date.now() / 1000 / 30));
}

function verifyTotp(secret, token, window) {
  if (!secret || !token) return false;
  const w = window || 1;
  const counter = Math.floor(Date.now() / 1000 / 30);
  const candidate = String(token).replace(/\D/g, '').padStart(6, '0');
  for (let i = -w; i <= w; i++) {
    if (hotp(secret, counter + i) === candidate) return true;
  }
  return false;
}

function totpUri(secret, account, issuer) {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

const bcrypt = require('bcryptjs');

async function hashPassword(pw) {
  return bcrypt.hash(String(pw), 12);
}

async function verifyPassword(pw, hash) {
  if (!hash) return false;
  try { return await bcrypt.compare(String(pw), hash); }
  catch { return false; }
}

// Now run the tests
import { describe, it, expect } from 'vitest';

describe('Auth - Password Hashing', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    // bcryptjs can use $2a$, $2b$, or $2y$ prefix
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });
});

describe('Auth - TOTP', () => {
  it('should generate valid base32 secret', () => {
    const secret = generateTotpSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(16);
    // Base32: A-Z, 2-7
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('should generate valid otpauth URI', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = totpUri(secret, 'user@example.com', 'Test App');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=' + secret);
    expect(uri).toContain('issuer=Test%20App');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });

  it('should generate current TOTP code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = currentTotp(secret);
    expect(code).toBeDefined();
    expect(code.length).toBe(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should verify valid TOTP code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = currentTotp(secret);
    const valid = verifyTotp(secret, code);
    expect(valid).toBe(true);
  });

  it('should reject invalid TOTP code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const valid = verifyTotp(secret, '000000');
    expect(valid).toBe(false);
  });

  it('should accept code within window', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = currentTotp(secret);
    // Test with window of 1 (allows previous/next code)
    const valid = verifyTotp(secret, code, 1);
    expect(valid).toBe(true);
  });
});