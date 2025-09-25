/**
 * users table
 * - id (PK)
 * - uuid (public identifier)
 * - email (unique)
 * - password_hash (bcrypt)
 * - role (user/admin)
 * - is_active
 * - last_login_at
 * - refresh_token_version (برای invalidation)
 * - created_at / updated_at
 */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    table.string('email', 191).notNullable().unique();
    table.timestamp('email_verified_at').nullable();
    table.string('password_hash', 255).notNullable();
    table.string('role', 50).notNullable().defaultTo('user');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at').nullable();
    table.integer('refresh_token_version').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
