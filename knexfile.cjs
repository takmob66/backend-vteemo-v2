require('dotenv').config();

const base = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  },
  pool: {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 10)
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  }
};

module.exports = {
  development: { ...base },
  production: { ...base }
};
