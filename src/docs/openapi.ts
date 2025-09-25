export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'VTEEMO API',
    version: process.env.APP_VERSION || '0.1.0'
  },
  servers: [
    { url: (process.env.APP_BASE_URL || '').replace(/\/$/, '') + (process.env.API_PREFIX || '') }
  ],
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    '/auth/register': { post: { summary: 'Register', responses: { '201': { description: 'Created' } } } },
    '/auth/login': { post: { summary: 'Login', responses: { '200': { description: 'OK' } } } },
    '/auth/refresh': { post: { summary: 'Refresh tokens', responses: { '200': { description: 'OK' } } } },
    '/auth/sessions': { get: { summary: 'List refresh sessions', responses: { '200': { description: 'OK' } } } },
    '/auth/sessions/revoke': { post: { summary: 'Revoke a session', responses: { '200': { description: 'OK' } } } },
    '/auth/sessions/revoke-all': { post: { summary: 'Revoke all sessions', responses: { '200': { description: 'OK' } } } },
    '/auth/verify/request': { post: { summary: 'Request email verification', responses: { '200': { description: 'OK' } } } },
    '/auth/verify/confirm': { post: { summary: 'Confirm email verification', responses: { '200': { description: 'OK' } } } },
    '/auth/password/forgot': { post: { summary: 'Request password reset', responses: { '200': { description: 'OK' } } } },
    '/auth/password/reset': { post: { summary: 'Reset password', responses: { '200': { description: 'OK' } } } },
    '/media/upload': { post: { summary: 'Upload media', responses: { '201': { description: 'Uploaded' } } } },
    '/media/{uuid}': { get: { summary: 'Get media metadata', parameters: [{ name: 'uuid', in: 'path', required: true }], responses: { '200': { description: 'OK' } } } },
    '/media/{uuid}/status': { get: { summary: 'Get processing status', parameters: [{ name: 'uuid', in: 'path', required: true }], responses: { '200': { description: 'OK' } } } },
    '/media': { get: { summary: 'List user media', responses: { '200': { description: 'OK' } } } },
    '/plans': { get: { summary: 'List active plans', responses: { '200': { description: 'OK' } } } },
    '/plans/subscribe': { post: { summary: 'Deprecated: use /payments/checkout', responses: { '400': { description: 'Bad Request' } } } },
    '/payments/checkout': { post: { summary: 'Create payment transaction', responses: { '201': { description: 'Created' } } } },
    '/payments/me': { get: { summary: 'List my payments', responses: { '200': { description: 'OK' } } } },
    '/payments/webhook': { post: { summary: 'Payment provider webhook', responses: { '200': { description: 'OK' } } } },
    '/metrics': { get: { summary: 'Metrics (non-prod)', responses: { '200': { description: 'OK' } } } }
  }
};
