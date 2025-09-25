import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import healthRoute from '../routes/health.js';
import authRoute from '../routes/auth.js';
import mediaRoute from '../routes/media.js';
import adminUsersRoute from '../routes/adminUsers.js';
import plansRoute from '../routes/plans.js';
import paymentsRoute from '../routes/payments.js';
// New YouTube-like routes
import channelsRoute from '../routes/channels.js';
import videosRoute from '../routes/videos.js';
import commentsRoute from '../routes/comments.js';
import notificationsRoute from '../routes/notifications.js';
import userRoute from '../routes/user.js';
import homeRoute from '../routes/home.js';
import client from 'prom-client';
import { notFound, errorHandler } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import { ipBlock } from '../middleware/ipBlock.js';

export function createApp() {
  const app = express();

  app.use(ipBlock);
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://vteemo.ir'],
    credentials: false
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  const prefix = process.env.API_PREFIX || '';

  app.use(prefix, healthRoute);
  app.use(prefix + '/auth', authRoute);
  app.use(prefix + '/media', mediaRoute);
  app.use(prefix + '/admin/users', adminUsersRoute);
  app.use(prefix + '/plans', plansRoute);
  app.use(prefix + '/payments', paymentsRoute);
  // New YouTube-like routes
  app.use(prefix + '/channels', channelsRoute);
  app.use(prefix + '/videos', videosRoute);
  app.use(prefix + '/comments', commentsRoute);
  app.use(prefix + '/notifications', notificationsRoute);
  app.use(prefix + '/user', userRoute);
  app.use(prefix + '/home', homeRoute);

  app.use(notFound);
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    // lazy load swagger-ui
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerUi = require('swagger-ui-express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { openapiSpec } = require('../docs/openapi');
    app.use(prefix + '/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

    app.get(prefix + '/metrics', async (req, res) => {
      if (process.env.METRICS_TOKEN && req.headers['x-metrics-token'] !== process.env.METRICS_TOKEN) {
        return res.status(401).send('unauthorized');
      }
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    });
  }

  return app;
}