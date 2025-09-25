exports.up = async function (knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) return;
  await knex.schema.alterTable('users', (t) => {
    t.index(['role'], 'idx_users_role');
    t.index(['is_active'], 'idx_users_is_active');
  });
};

exports.down = async function (knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) return;
  await knex.schema.alterTable('users', (t) => {
    t.dropIndex(['role'], 'idx_users_role');
    t.dropIndex(['is_active'], 'idx_users_is_active');
  });
};
