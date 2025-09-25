import { getDB } from '../config/database';
const db = getDB();

export interface PaymentTx {
  id: number;
  user_id: number;
  plan_id: number;
  provider: string;
  external_id: string;
  status: string;
  amount: number;
  currency: string;
  meta?: string | null;
  created_at: Date;
  updated_at: Date;
}

const TABLE = 'payment_transactions';

export async function createPaymentTx(data: Omit<PaymentTx, 'id' | 'created_at' | 'updated_at'>) {
  const [id] = await db(TABLE).insert(data);
  return db<PaymentTx>(TABLE).where({ id }).first();
}

export async function findByProviderExternal(provider: string, external_id: string) {
  return db<PaymentTx>(TABLE).where({ provider, external_id }).first();
}

export async function markPaymentStatus(id: number, status: string, meta?: any) {
  await db(TABLE).where({ id }).update({
    status,
    meta: meta ? JSON.stringify(meta) : undefined
  });
  return db<PaymentTx>(TABLE).where({ id }).first();
}

export async function listUserPayments(userId: number, limit = 20, offset = 0) {
  return db<PaymentTx>(TABLE)
    .where({ user_id: userId })
    .orderBy('id', 'desc')
    .limit(limit)
    .offset(offset);
}
