import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4008').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  INTERNAL_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
