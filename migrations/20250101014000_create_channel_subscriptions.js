/**
 * Create channel_subscriptions table for subscribe/unsubscribe functionality
 */
exports.up = async function (knex) {
  await knex.schema.createTable('channel_subscriptions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('channel_id').unsigned().notNullable()
      .references('id').inTable('channels')
      .onDelete('CASCADE');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.boolean('notifications_enabled').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['channel_id', 'user_id']);
    table.index(['channel_id']);
    table.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('channel_subscriptions');
};