exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('refresh_sessions');
  if (exists) return;
  await knex.schema.createTable('refresh_sessions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 128).notNullable().unique();
    t.string('ip', 64).nullable();
    t.string('user_agent', 512).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.index(['user_id']);
    t.index(['expires_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_sessions');
};
