/**
 * Create video_views table for tracking video views
 */
exports.up = async function (knex) {
  await knex.schema.createTable('video_views', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('video_id').unsigned().notNullable()
      .references('id').inTable('videos')
      .onDelete('CASCADE');
    table.bigInteger('user_id').unsigned().nullable()
      .references('id').inTable('users')
      .onDelete('SET NULL'); // Allow anonymous views
    table.string('ip_address', 45).nullable(); // IPv4/IPv6
    table.string('user_agent', 500).nullable();
    table.integer('watch_time_seconds').nullable(); // How long they watched
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['video_id']);
    table.index(['user_id']);
    table.index(['ip_address']);
    table.index(['created_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('video_views');
};