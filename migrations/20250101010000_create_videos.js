/**
 * Create videos table - extend media table with video-specific metadata
 */
exports.up = async function (knex) {
  await knex.schema.createTable('videos', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    table.bigInteger('media_id').unsigned().notNullable()
      .references('id').inTable('media')
      .onDelete('CASCADE');
    table.bigInteger('channel_id').unsigned().notNullable()
      .references('id').inTable('channels')
      .onDelete('CASCADE');
    table.string('title', 500).notNullable();
    table.text('description').nullable();
    table.text('tags').nullable(); // JSON array of tags
    table.string('category', 100).nullable();
    table.string('language', 10).nullable().defaultTo('fa');
    table.enum('privacy', ['public', 'unlisted', 'private']).notNullable().defaultTo('public');
    table.bigInteger('views_count').notNullable().defaultTo(0);
    table.bigInteger('likes_count').notNullable().defaultTo(0);
    table.bigInteger('dislikes_count').notNullable().defaultTo(0);
    table.bigInteger('comments_count').notNullable().defaultTo(0);
    table.integer('duration_seconds').nullable();
    table.boolean('comments_enabled').notNullable().defaultTo(true);
    table.boolean('is_monetized').notNullable().defaultTo(false);
    table.boolean('age_restricted').notNullable().defaultTo(false);
    table.timestamp('published_at').nullable();
    table.timestamp('scheduled_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['channel_id']);
    table.index(['privacy']);
    table.index(['published_at']);
    table.index(['views_count']);
    table.index(['category']);
    table.index(['created_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('videos');
};