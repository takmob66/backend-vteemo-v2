exports.up = async function (knex) {
  // جدول پلن‌ها
  await knex.schema.createTable('plans', (t) => {
    t.bigIncrements('id').primary();
    t.string('name', 100).notNullable().unique();
    t.string('description', 500);
    t.integer('price').notNullable(); // ریال یا تومان
    t.integer('duration_days').notNullable(); // مدت اعتبار
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // جدول اشتراک کاربران
  await knex.schema.createTable('user_subscriptions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.bigInteger('plan_id').unsigned().notNullable()
      .references('id').inTable('plans').onDelete('CASCADE');
    t.timestamp('start_at').notNullable();
    t.timestamp('end_at').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.index(['user_id']);
    t.index(['plan_id']);
    t.index(['is_active']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_subscriptions');
  await knex.schema.dropTableIfExists('plans');
};
