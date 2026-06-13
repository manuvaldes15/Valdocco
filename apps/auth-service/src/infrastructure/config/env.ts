import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  INTERNAL_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.string().default('7').transform(Number),
});

export const env = envSchema.parse(process.env);
