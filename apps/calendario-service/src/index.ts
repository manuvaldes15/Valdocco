import express from 'express';
import Redis from 'ioredis';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { DomainError, EventoNotificacion } from '@valdocco/shared-types';
import { env } from './infrastructure/config/env';
import { PrismaCalendarioRepository } from './infrastructure/persistence/PrismaCalendarioRepository';
import { EmitirFichaUseCase, IEventPublisher } from './application/use-cases/EmitirFicha';
import { GenerarCuadroHonorUseCase } from './application/use-cases/GenerarCuadroHonor';
import { CuadroHonorSeccionUseCase } from './application/use-cases/CuadroHonorSeccion';

const logger = createLogger('calendario-service');

class RedisEventPublisher implements IEventPublisher {
  private redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  async publish(channel: string, evento: EventoNotificacion) {
    try {
      await this.redis.publish(channel, JSON.stringify(evento));
    } catch {
      // La notificación no debe romper la operación principal
    }
  }
}

const repo = new PrismaCalendarioRepository();
const emitirFicha = new EmitirFichaUseCase(repo, new RedisEventPublisher());
const generarCuadroHonor = new GenerarCuadroHonorUseCase(repo);
const cuadroHonorSeccion = new CuadroHonorSeccionUseCase(repo);

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm');

const recurrenteSchema = z.object({
  nombre: z.string().min(1).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  diaSemana: z.number().int().min(1).max(7),
  horaInicio: horaSchema.optional().nullable(),
  horaFin: horaSchema.optional().nullable(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']).optional().nullable(),
});

const eventoSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  tipoEvento: z.enum(['ACADEMICO', 'INSTITUCIONAL', 'FERIADO', 'EVALUACION']).optional().nullable(),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']).optional().nullable(),
  gradoDestinoId: z.string().uuid().optional().nullable(),
});

const anuncioSchema = z.object({
  titulo: z.string().min(1).max(200),
  contenido: z.string().min(1).max(5000),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']).optional().nullable(),
  gradoDestinoId: z.string().uuid().optional().nullable(),
  esDestacado: z.boolean().default(false),
});

const fichaSchema = z.object({
  alumnoId: z.string().uuid(),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().min(1).max(5000),
  gravedad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  fechaEmision: z.coerce.date(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'calendario-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const gestion = requireRoles('ADMIN', 'DIRECTOR');
const docente = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');

// ── Endpoints públicos (sitio institucional, sin login) ──
r.get('/publico/cuadro-honor', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.cuadroHonorActual() });
}));

r.get('/publico/anuncios', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarAnuncios(true) });
}));

r.get('/publico/eventos', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarEventos(new Date()) });
}));

// ── Eventos ──
r.get('/eventos', asyncHandler(async (req, res) => {
  const q = z.object({ desde: z.coerce.date().optional(), hasta: z.coerce.date().optional() }).parse(req.query);
  res.json({ success: true, data: await repo.listarEventos(q.desde, q.hasta) });
}));

r.post('/eventos', gestion, asyncHandler(async (req, res) => {
  const dto = eventoSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await repo.crearEvento(dto, ctx.userId) });
}));

// ── Anuncios ──
r.get('/anuncios', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarAnuncios(true) });
}));

r.post('/anuncios', gestion, asyncHandler(async (req, res) => {
  const dto = anuncioSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await repo.crearAnuncio(dto, ctx.userId) });
}));

// ── Fichas de atención ──
r.get('/fichas', asyncHandler(async (req, res) => {
  const filtro = z
    .object({
      alumnoId: z.string().uuid().optional(),
      maestroId: z.string().uuid().optional(),
      estado: z.enum(['ABIERTA', 'ACUSADA', 'RESUELTA', 'ARCHIVADA']).optional(),
    })
    .parse(req.query);
  res.json({ success: true, data: await repo.listarFichas(filtro) });
}));

r.post('/fichas', docente, asyncHandler(async (req, res) => {
  const dto = fichaSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await emitirFicha.execute(dto, ctx.personId, ctx.userId) });
}));

r.post('/fichas/:id/acusar', requireRoles('RESPONSABLE'), asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  res.json({ success: true, data: await repo.acusarFicha(req.params.id, ctx.userId) });
}));

r.post('/fichas/:id/resolver', docente, asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  res.json({ success: true, data: await repo.resolverFicha(req.params.id, ctx.userId) });
}));

// ── Catálogo de actividades recurrentes ──
r.get('/recurrentes', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarRecurrentes() });
}));

r.post('/recurrentes', gestion, asyncHandler(async (req, res) => {
  const dto = recurrenteSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await repo.crearRecurrente(dto, ctx.userId) });
}));

r.delete('/recurrentes/:id', gestion, asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  await repo.eliminarRecurrente(req.params.id, ctx.userId);
  res.json({ success: true, data: { mensaje: 'Actividad eliminada del catálogo' } });
}));

// ── Cuadro de honor (vista interna) ──
r.get('/cuadro-honor', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.cuadroHonorActual() });
}));

// Genera el cuadro de honor del periodo vigente (top N por grado) — barrido global del director
r.post('/cuadro-honor/generar', gestion, asyncHandler(async (req, res) => {
  const dto = z.object({ top: z.number().int().min(1).max(10).default(3) }).parse(req.body ?? {});
  const ctx = getUserContext(req);
  res.json({ success: true, data: await generarCuadroHonor.execute(dto.top, ctx.userId) });
}));

// ── Cuadro de honor por sección (docente guía) ──

/** maestroId al que restringir, o null si es ADMIN/DIRECTOR (sin restricción). */
async function maestroRestriccion(req: express.Request): Promise<string | null> {
  const ctx = getUserContext(req);
  if (ctx.role !== 'MAESTRO') return null;
  const maestroId = await repo.maestroDePersona(ctx.personId);
  if (!maestroId) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
  return maestroId;
}

// Secciones de las que el maestro autenticado es guía
r.get('/cuadro-honor/mis-secciones', requireRoles('MAESTRO'), asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  const maestroId = await repo.maestroDePersona(ctx.personId);
  if (!maestroId) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
  res.json({ success: true, data: await cuadroHonorSeccion.misSecciones(maestroId) });
}));

// Previsualiza (sin publicar) el cuadro de honor de una sección
r.get('/cuadro-honor/seccion/:seccionId', docente, asyncHandler(async (req, res) => {
  const top = z.coerce.number().int().min(1).max(10).default(3).parse(req.query.top);
  const restriccion = await maestroRestriccion(req);
  res.json({ success: true, data: await cuadroHonorSeccion.previsualizar(req.params.seccionId, top, restriccion) });
}));

// Publica el cuadro de honor de una sección (lo deja visible en la plataforma)
r.post('/cuadro-honor/seccion/:seccionId/publicar', docente, asyncHandler(async (req, res) => {
  const dto = z.object({ top: z.number().int().min(1).max(10).default(3) }).parse(req.body ?? {});
  const ctx = getUserContext(req);
  const restriccion = await maestroRestriccion(req);
  res.json({ success: true, data: await cuadroHonorSeccion.publicar(req.params.seccionId, dto.top, restriccion, ctx.userId) });
}));

app.use('/api/calendario', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`calendario-service escuchando en puerto ${env.PORT}`));
