import crypto from 'crypto';

function rand(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

const out = {
  JWT_SECRET: rand(48),
  JWT_REFRESH_SECRET: rand(48),
  SESSION_SECRET: rand(32),
  PAYMENT_WEBHOOK_SECRET: rand(32),
  METRICS_TOKEN: rand(24),
  ADMIN_PASSWORD: rand(16) // برای ادمین اولیه
};

console.log('--- GENERATED SECRETS ---');
for (const [k, v] of Object.entries(out)) {
  console.log(`${k}=${v}`);
}
console.log('\nCopy JWT_SECRET, JWT_REFRESH_SECRET, etc. to Liara Environment Variables.');
console.log('Use ADMIN_PASSWORD for initial admin login.');
console.log('DO NOT commit these values to git!');
