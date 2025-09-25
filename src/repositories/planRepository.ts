import { getDB } from '../config/database';

const db = getDB();

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  start_at: Date;
  end_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listPlans() {
  return db<Plan>('plans').where({ is_active: true }).orderBy('price', 'asc');
}

export async function findPlanById(id: number) {
  return db<Plan>('plans').where({ id }).first();
}

export async function createSubscription(user_id: number, plan_id: number, start_at: Date, end_at: Date) {
  const [id] = await db<UserSubscription>('user_subscriptions').insert({
    user_id, plan_id, start_at, end_at, is_active: true
  });
  return db<UserSubscription>('user_subscriptions').where({ id }).first();
}

export async function getUserActiveSubscription(user_id: number) {
  return db<UserSubscription>('user_subscriptions')
    .where({ user_id, is_active: true })
    .andWhere('end_at', '>', db.fn.now())
    .orderBy('end_at', 'desc')
    .first();
}

export async function seedDefaultPlans() {
  const existing = await db<Plan>('plans').count<{ c: number }>('* as c').first();
  if (existing && Number(existing.c) > 0) return;
  await db<Plan>('plans').insert([
    { name: 'basic', description: 'Basic plan', price: 0, duration_days: 30, is_active: true },
    { name: 'pro', description: 'Pro plan', price: 100000, duration_days: 30, is_active: true },
    { name: 'yearly', description: 'Yearly plan', price: 1000000, duration_days: 365, is_active: true }
  ]);
}

export async function activateSubscription(user_id: number, plan_id: number, planDurationDays: number) {
  // غیرفعال کردن اشتراک‌های قبلی فعال
  await db('user_subscriptions')
    .where({ user_id, is_active: true })
    .andWhere('end_at', '>', db.fn.now())
    .update({ is_active: false });
  const start = new Date();
  const end = new Date(start.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const [id] = await db('user_subscriptions').insert({
    user_id,
    plan_id,
    start_at: start,
    end_at: end,
    is_active: true
  });
  return db('user_subscriptions').where({ id }).first();
}
