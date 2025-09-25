/**
 * Create playlist_videos table for playlist-video relationships
 */
exports.up = async function (knex) {
  await knex.schema.createTable('playlist_videos', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('playlist_id').unsigned().notNullable()
      .references('id').inTable('playlists')
      .onDelete('CASCADE');
    table.bigInteger('video_id').unsigned().notNullable()
      .references('id').inTable('videos')
      .onDelete('CASCADE');
    table.integer('position').notNullable().defaultTo(0);
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['playlist_id', 'video_id']);
    table.index(['playlist_id']);
    table.index(['video_id']);
    table.index(['position']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('playlist_videos');
};