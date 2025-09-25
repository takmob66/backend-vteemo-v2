exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('media');
  if (!hasTable) return;
  const hasCol = await knex.schema.hasColumn('media', 'thumbnails');
  if (!hasCol) {
    await knex.schema.alterTable('media', (t) => {
      t.text('thumbnails').nullable(); // JSON: [{url,width,height}]
    });
  }
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('media');
  if (!hasTable) return;
  const hasCol = await knex.schema.hasColumn('media', 'thumbnails');
  if (hasCol) {
    await knex.schema.alterTable('media', (t) => {
      t.dropColumn('thumbnails');
    });
  }
};
