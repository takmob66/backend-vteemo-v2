/**
 * Alter media table: add processing metadata
 */
exports.up = async function (knex) {
  const hasDuration = await knex.schema.hasColumn('media', 'duration_seconds');
  if (!hasDuration) {
    await knex.schema.alterTable('media', (t) => {
      t.integer('duration_seconds').nullable();
      t.integer('width').nullable();
      t.integer('height').nullable();
      t.text('processed_variants').nullable(); // JSON string: [{quality,url,width,height}]
      t.text('processing_errors').nullable();
      t.string('status', 50).notNullable().defaultTo('uploaded').alter();
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('media', (t) => {
    t.dropColumn('duration_seconds');
    t.dropColumn('width');
    t.dropColumn('height');
    t.dropColumn('processed_variants');
    t.dropColumn('processing_errors');
  });
};
