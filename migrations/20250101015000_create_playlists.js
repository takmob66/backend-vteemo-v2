/**
 * Create playlists table for playlist functionality
 */
exports.up = async function (knex) {
  await knex.schema.createTable('playlists', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    table.bigInteger('channel_id').unsigned().notNullable()
      .references('id').inTable('channels')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.enum('privacy', ['public', 'unlisted', 'private']).notNullable().defaultTo('public');
    table.bigInteger('videos_count').notNullable().defaultTo(0);
    table.bigInteger('views_count').notNullable().defaultTo(0);
    table.string('thumbnail_url', 1000).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['channel_id']);
    table.index(['privacy']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('playlists');
};