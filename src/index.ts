import 'dotenv/config';
import { createApp } from './loaders/express';
import { getDB, closeDB } from './config/database';
import { ensureAdminSeed } from './startup/ensureAdmin';
import { ensurePlansSeed } from './startup/ensurePlansSeed'; // (نام فایل: seedPlans.ts)
import { validateEnv } from './startup/validateEnv';
import { logger } from './utils/logger';
import { runMigrations } from './startup/runMigrations';

const port = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await runMigrations();
    await getDB().raw('SELECT 1');
    const app = createApp();
    await validateEnv();
    await ensureAdminSeed();
    await ensurePlansSeed();
    const server = app.listen(port, () => {
      logger.info({ port }, '[BOOT] Server listening');
    });

    const shutdown = async (signal: string) => {
      logger.warn({ signal }, '[SHUTDOWN] Received');
      server.close(async () => {
        await closeDB();
        logger.info('[SHUTDOWN] Closed gracefully');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('[SHUTDOWN] Force exit');
        process.exit(1);
      }, 8000).unref();
    };

    ['SIGINT', 'SIGTERM'].forEach(sig => {
      process.on(sig as NodeJS.Signals, () => shutdown(sig));
    });
  } catch (e) {
    logger.error({ err: e }, '[BOOT ERROR]');
    process.exit(1);
  }
}

bootstrap();
