import 'dotenv/config';
import { runMigrations } from './startup/runMigrations';
import './index';

(async () => {
  try {
    await runMigrations();
    // index.ts already bootstraps the server
  } catch (e) {
    console.error('[AUTO_START] Migration failed', e);
    process.exit(1);
  }
})();
