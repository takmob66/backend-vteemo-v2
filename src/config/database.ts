import knex, { Knex } from 'knex';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  KNEX_DEBUG,
  DB_POOL_MIN,
  DB_POOL_MAX
} = process.env;

let dbInstance: Knex | null = null;

export function getDB(): Knex {
  if (dbInstance) return dbInstance;
  dbInstance = knex({
    client: 'mysql2',
    connection: {
      host: DB_HOST,
      port: DB_PORT ? parseInt(DB_PORT, 10) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      charset: 'utf8mb4'
    },
    pool: {
      min: DB_POOL_MIN ? parseInt(DB_POOL_MIN, 10) : 2,
      max: DB_POOL_MAX ? parseInt(DB_POOL_MAX, 10) : 10
    },
    debug: KNEX_DEBUG === 'true'
  });
  return dbInstance;
}

export async function testConnection() {
  await getDB().raw('SELECT 1');
}

export async function closeDB() {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
