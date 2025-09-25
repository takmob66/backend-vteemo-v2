/**
 * Create video_likes table for like/dislike functionality
 */
exports.up = async function (knex) {
  await knex.schema.createTable('video_likes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('video_id').unsigned().notNullable()
      .references('id').inTable('videos')
      .onDelete('CASCADE');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.enum('type', ['like', 'dislike']).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['video_id', 'user_id']);
    table.index(['video_id']);
    table.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('video_likes');
};