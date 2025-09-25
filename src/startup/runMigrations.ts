import { spawn } from 'child_process';
import path from 'path';

export function runMigrations(): Promise<void> {
  return new Promise((resolve, reject) => {
    const knexFile = path.join(process.cwd(), 'knexfile.cjs');
    const child = spawn('node', [
      './node_modules/knex/bin/cli.js',
      '--knexfile',
      knexFile,
      'migrate:latest'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    child.stdout.on('data', d => process.stdout.write(`[MIGRATE] ${d}`));
    child.stderr.on('data', d => process.stderr.write(`[MIGRATE:ERR] ${d}`));

    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error('Migration failed with code ' + code));
    });
  });
}
