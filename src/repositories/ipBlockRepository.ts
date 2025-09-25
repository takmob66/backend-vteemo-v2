import { getDB } from '../config/database';
const db = getDB();
const TABLE = 'blocked_ips';

export async function isIpBlocked(ip: string) {
  if (!ip) return false;
  const row = await db(TABLE).where({ ip }).first();
  return !!row;
}
