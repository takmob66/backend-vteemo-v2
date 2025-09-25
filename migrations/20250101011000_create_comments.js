/**
 * Create comments table for video comments
 */
exports.up = async function (knex) {
  await knex.schema.createTable('comments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    table.bigInteger('video_id').unsigned().notNullable()
      .references('id').inTable('videos')
      .onDelete('CASCADE');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.bigInteger('parent_id').unsigned().nullable()
      .references('id').inTable('comments')
      .onDelete('CASCADE'); // For replies
    table.text('content').notNullable();
    table.bigInteger('likes_count').notNullable().defaultTo(0);
    table.bigInteger('dislikes_count').notNullable().defaultTo(0);
    table.bigInteger('replies_count').notNullable().defaultTo(0);
    table.boolean('is_pinned').notNullable().defaultTo(false);
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['video_id']);
    table.index(['user_id']);
    table.index(['parent_id']);
    table.index(['created_at']);
    table.index(['is_deleted']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('comments');
};