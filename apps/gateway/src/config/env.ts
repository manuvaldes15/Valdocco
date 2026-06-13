import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32),
  INTERNAL_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:4001'),
  PERSONAS_SERVICE_URL: z.string().url().default('http://localhost:4002'),
  ACADEMICO_SERVICE_URL: z.string().url().default('http://localhost:4003'),
  INSCRIPCIONES_SERVICE_URL: z.string().url().default('http://localhost:4004'),
  CALIFICACIONES_SERVICE_URL: z.string().url().default('http://localhost:4005'),
  HORARIOS_SERVICE_URL: z.string().url().default('http://localhost:4006'),
  CALENDARIO_SERVICE_URL: z.string().url().default('http://localhost:4007'),
  NOTIFICACIONES_SERVICE_URL: z.string().url().default('http://localhost:4008'),
  REPORTES_SERVICE_URL: z.string().url().default('http://localhost:4009'),
});

export const env = envSchema.parse(process.env);
