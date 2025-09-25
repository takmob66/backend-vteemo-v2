const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

export function validateEnv() {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn('[ENV] Missing recommended vars:', missing.join(', '));
  }
}
