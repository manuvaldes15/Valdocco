import express from 'express';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { DomainError } from '@valdocco/shared-types';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaHorariosRepository } from './infrastructure/persistence/PrismaHorariosRepository';
import { CrearHorarioClaseUseCase } from './application/use-cases/CrearHorarioClase';

const logger = createLogger('horarios-service');

const repo = new PrismaHorariosRepository();
const crearHorario = new CrearHorarioClaseUseCase(repo);

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm');

const horarioClaseSchema = z.object({
  // Opcionales: para un MAESTRO se derivan de su asignación sección-materia.
  maestroId: z.string().uuid().optional(),
  seccionMateriaId: z.string().uuid(),
  aulaId: z.string().uuid(),
  anioLectivoId: z.string().uuid().optional(),
  diaSemana: z.number().int().min(1).max(5),
  horaInicio: horaSchema,
  horaFin: horaSchema,
});

const aulaSchema = z.object({
  nombre: z.string().min(1).max(50),
  capacidad: z.number().int().min(1).max(100).optional(),
  edificio: z.string().max(100).optional(),
  turnoManana: z.boolean().optional(),
  turnoTarde: z.boolean().optional(),
});

const laboralSchema = z.object({
  maestroId: z.string().uuid(),
  anioLectivoId: z.string().uuid(),
  diaSemana: z.number().int().min(1).max(5),
  horaEntrada: horaSchema,
  horaSalida: horaSchema,
  turno: z.enum(['MANANA', 'TARDE']).optional(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'horarios-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const gestion = requireRoles('ADMIN', 'DIRECTOR');
const docente = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');

/** Devuelve el maestroId al que se debe restringir la operación, o undefined si es gestión total. */
async function restriccionMaestro(req: express.Request): Promise<string | undefined> {
  const ctx = getUserContext(req);
  if (ctx.role !== 'MAESTRO') return undefined;
  const maestroId = await repo.maestroIdDePersona(ctx.personId);
  if (!maestroId) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
  return maestroId;
}

r.get('/clases', asyncHandler(async (req, res) => {
  const filtro = z
    .object({
      maestroId: z.string().uuid().optional(),
      aulaId: z.string().uuid().optional(),
      anioLectivoId: z.string().uuid().optional(),
      seccionId: z.string().uuid().optional(),
    })
    .parse(req.query);
  res.json({ success: true, data: await repo.listarHorarios(filtro) });
}));

r.post('/clases', docente, asyncHandler(async (req, res) => {
  const dto = horarioClaseSchema.parse(req.body);
  const ctx = getUserContext(req);
  const soloMaestroId = await restriccionMaestro(req);
  res.status(201).json({ success: true, data: await crearHorario.execute(dto, ctx.userId, soloMaestroId) });
}));

r.delete('/clases/:id', docente, asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  const soloMaestroId = await restriccionMaestro(req);
  if (soloMaestroId) {
    const dueno = await repo.maestroDeHorarioClase(req.params.id);
    if (dueno !== soloMaestroId) throw new DomainError('Solo puede eliminar horarios propios', 403, 'NO_ES_SU_HORARIO');
  }
  await repo.eliminarHorarioClase(req.params.id, ctx.userId);
  res.json({ success: true, data: { mensaje: 'Horario eliminado' } });
}));

r.get('/aulas', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarAulas() });
}));

r.post('/aulas', gestion, asyncHandler(async (req, res) => {
  const dto = aulaSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await repo.crearAula(dto, ctx.userId) });
}));

r.get('/laborales/:maestroId', asyncHandler(async (req, res) => {
  const anioLectivoId = typeof req.query.anioLectivoId === 'string' ? req.query.anioLectivoId : undefined;
  res.json({ success: true, data: await repo.listarHorariosLaborales(req.params.maestroId, anioLectivoId) });
}));

r.post('/laborales', gestion, asyncHandler(async (req, res) => {
  const dto = laboralSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await repo.crearHorarioLaboral(dto, ctx.userId) });
}));

app.use('/api/horarios', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`horarios-service escuchando en puerto ${env.PORT}`));
