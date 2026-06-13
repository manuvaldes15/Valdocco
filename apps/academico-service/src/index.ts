import express from 'express';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaAcademicoRepository } from './infrastructure/persistence/PrismaAcademicoRepository';
import {
  CrearAnioLectivoUseCase,
  CrearAsignacionUseCase,
  CrearMateriaUseCase,
  CrearSeccionUseCase,
} from './application/use-cases/GestionarEstructura';

const logger = createLogger('academico-service');

const repo = new PrismaAcademicoRepository();
const crearSeccion = new CrearSeccionUseCase(repo);
const crearMateria = new CrearMateriaUseCase(repo);
const crearAsignacion = new CrearAsignacionUseCase(repo);
const crearAnio = new CrearAnioLectivoUseCase(repo);

const seccionSchema = z.object({
  gradoId: z.string().uuid(),
  nombre: z.string().min(1).max(10),
  turno: z.enum(['MANANA', 'TARDE']),
  notaMinimaAprobacion: z.number().min(0).max(10).optional(),
  capacidad: z.number().int().min(1).max(60).optional(),
});

const materiaSchema = z.object({
  nombre: z.string().min(1).max(200),
  codigo: z.string().max(20).optional().nullable(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  descripcion: z.string().max(1000).optional().nullable(),
});

const asignacionSchema = z.object({
  seccionId: z.string().uuid(),
  materiaId: z.string().uuid(),
  maestroId: z.string().uuid(),
  anioLectivoId: z.string().uuid(),
  horasSemanales: z.number().min(0.5).max(40).optional(),
});

const anioSchema = z.object({
  nombre: z.string().min(4).max(20),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  activo: z.boolean().default(false),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'academico-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const gestion = requireRoles('ADMIN', 'DIRECTOR');

r.get('/estructura', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.estructura() });
}));

r.get('/anios-lectivos', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarAniosLectivos() });
}));

r.get('/anios-lectivos/activo', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.anioActivo() });
}));

r.post('/anios-lectivos', gestion, asyncHandler(async (req, res) => {
  const dto = anioSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearAnio.execute(dto, ctx.userId) });
}));

r.post('/anios-lectivos/:id/activar', gestion, asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  res.json({ success: true, data: await repo.activarAnioLectivo(req.params.id, ctx.userId) });
}));

r.get('/secciones', asyncHandler(async (req, res) => {
  const gradoId = typeof req.query.gradoId === 'string' ? req.query.gradoId : undefined;
  res.json({ success: true, data: await repo.listarSecciones(gradoId) });
}));

r.post('/secciones', gestion, asyncHandler(async (req, res) => {
  const dto = seccionSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearSeccion.execute(dto, ctx.userId) });
}));

r.get('/materias', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.listarMaterias() });
}));

r.post('/materias', gestion, asyncHandler(async (req, res) => {
  const dto = materiaSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearMateria.execute(dto, ctx.userId) });
}));

r.get('/asignaciones', asyncHandler(async (req, res) => {
  const filtro = z
    .object({
      seccionId: z.string().uuid().optional(),
      maestroId: z.string().uuid().optional(),
      anioLectivoId: z.string().uuid().optional(),
    })
    .parse(req.query);
  res.json({ success: true, data: await repo.listarAsignaciones(filtro) });
}));

r.post('/asignaciones', gestion, asyncHandler(async (req, res) => {
  const dto = asignacionSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearAsignacion.execute(dto, ctx.userId) });
}));

app.use('/api/academico', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`academico-service escuchando en puerto ${env.PORT}`));
