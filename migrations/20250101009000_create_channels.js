/**
 * Create channels table for YouTube-like functionality
 */
exports.up = async function (knex) {
  await knex.schema.createTable('channels', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('handle', 100).notNullable().unique(); // @username
    table.text('description').nullable();
    table.string('avatar_url', 1000).nullable();
    table.string('banner_url', 1000).nullable();
    table.bigInteger('subscribers_count').notNullable().defaultTo(0);
    table.bigInteger('videos_count').notNullable().defaultTo(0);
    table.bigInteger('views_count').notNullable().defaultTo(0);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['user_id']);
    table.index(['handle']);
    table.index(['is_active']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('channels');
};