exports.up = async function (knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasCol = await knex.schema.hasColumn('users', 'email_verified_at');
    if (!hasCol) {
      await knex.schema.alterTable('users', (t) => {
        t.timestamp('email_verified_at').nullable().after('email');
      });
    }
  }

  if (!(await knex.schema.hasTable('email_verification_tokens'))) {
    await knex.schema.createTable('email_verification_tokens', (t) => {
      t.bigIncrements('id').primary();
      t.bigInteger('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.string('token_hash', 128).notNullable().unique();
      t.timestamp('expires_at').notNullable();
      t.timestamp('used_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.index(['user_id']);
      t.index(['expires_at']);
    });
  }

  if (!(await knex.schema.hasTable('password_reset_tokens'))) {
    await knex.schema.createTable('password_reset_tokens', (t) => {
      t.bigIncrements('id').primary();
      t.bigInteger('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.string('token_hash', 128).notNullable().unique();
      t.timestamp('expires_at').notNullable();
      t.timestamp('used_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.index(['user_id']);
      t.index(['expires_at']);
    });
  }

  if (!(await knex.schema.hasTable('blocked_ips'))) {
    await knex.schema.createTable('blocked_ips', (t) => {
      t.bigIncrements('id').primary();
      t.string('ip', 64).notNullable().unique();
      t.string('reason', 255).nullable();
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('blocked_ips');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('email_verification_tokens');
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers && await knex.schema.hasColumn('users', 'email_verified_at')) {
    await knex.schema.alterTable('users', (t) => t.dropColumn('email_verified_at'));
  }
};
