/**
 * media table
 * - id
 * - uuid (public)
 * - user_id (owner)
 * - original_name
 * - storage_key
 * - url (public)
 * - mime_type
 * - type (image|video|other)
 * - size_bytes
 * - status (uploaded|processing|ready|failed)
 * - created_at / updated_at
 */
exports.up = async function (knex) {
  await knex.schema.createTable('media', (t) => {
    t.bigIncrements('id').primary();
    t.uuid('uuid').notNullable().unique().defaultTo(knex.raw('(UUID())'));
    t.bigInteger('user_id').unsigned().nullable()
      .references('id').inTable('users')
      .onDelete('SET NULL');
    t.string('original_name', 255).notNullable();
    t.string('storage_key', 500).notNullable().unique();
    t.string('url', 1000).notNullable();
    t.string('mime_type', 191).notNullable();
    t.string('type', 50).notNullable().defaultTo('other');
    t.bigInteger('size_bytes').notNullable();
    t.string('status', 50).notNullable().defaultTo('uploaded');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.index(['user_id']);
    t.index(['type']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('media');
};
