import { seedDefaultPlans } from '../repositories/planRepository';

export async function ensurePlansSeed() {
  await seedDefaultPlans();
}
