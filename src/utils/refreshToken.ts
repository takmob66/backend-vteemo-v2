import crypto from 'crypto';

export function generateRawRefreshToken() {
  return crypto.randomBytes(48).toString('hex'); // 96 chars
}

export function hashRefreshToken(raw: string) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function calcExpiry(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
