/**
 * Create comment_likes table for comment like/dislike functionality
 */
exports.up = async function (knex) {
  await knex.schema.createTable('comment_likes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('comment_id').unsigned().notNullable()
      .references('id').inTable('comments')
      .onDelete('CASCADE');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.enum('type', ['like', 'dislike']).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['comment_id', 'user_id']);
    table.index(['comment_id']);
    table.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('comment_likes');
};