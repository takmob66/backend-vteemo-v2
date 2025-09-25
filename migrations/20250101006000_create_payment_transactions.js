exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('payment_transactions');
  if (exists) return;
  await knex.schema.createTable('payment_transactions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.bigInteger('plan_id').unsigned().notNullable().references('id').inTable('plans').onDelete('CASCADE');
    t.string('provider', 50).notNullable();
    t.string('external_id', 191).notNullable();
    t.string('status', 50).notNullable().defaultTo('pending'); // pending|success|failed
    t.integer('amount').notNullable();
    t.string('currency', 10).notNullable().defaultTo('IRR');
    t.text('meta').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.index(['user_id']);
    t.index(['plan_id']);
    t.unique(['provider', 'external_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('payment_transactions');
};
