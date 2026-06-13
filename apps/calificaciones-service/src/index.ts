import express from 'express';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { DomainError } from '@valdocco/shared-types';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaCalificacionesRepository } from './infrastructure/persistence/PrismaCalificacionesRepository';
import { RedisEventPublisher } from './infrastructure/messaging/RedisEventPublisher';
import { CrearActividadUseCase } from './application/use-cases/CrearActividad';
import { CalificarNotaUseCase } from './application/use-cases/CalificarNota';
import { resumenPeriodo } from './domain/services/CalculoNotas';

const logger = createLogger('calificaciones-service');

const repo = new PrismaCalificacionesRepository();
const publisher = new RedisEventPublisher();
const crearActividad = new CrearActividadUseCase(repo);
const calificarNota = new CalificarNotaUseCase(repo, publisher);

const actividadSchema = z.object({
  seccionMateriaId: z.string().uuid(),
  periodoEvaluacionId: z.string().uuid(),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  tipo: z.enum(['EXAMEN', 'TAREA', 'PROYECTO', 'QUIZ', 'PARTICIPACION', 'OTRO']),
  porcentajePeso: z.number().gt(0).max(100),
  notaMaxima: z.number().gt(0).max(100).default(10),
  fechaEntrega: z.coerce.date().optional().nullable(),
});

const calificarSchema = z.object({
  alumnoId: z.string().uuid(),
  nota: z.number().min(0).max(100),
  comentario: z.string().max(1000).optional().nullable(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'calificaciones-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const docente = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');

/** Si el usuario es MAESTRO, exige que la asignación sea suya. ADMIN/DIRECTOR sin restricción. */
async function exigirPropiedadSeccionMateria(req: express.Request, seccionMateriaId: string) {
  const ctx = getUserContext(req);
  if (ctx.role !== 'MAESTRO') return;
  const propio = await repo.maestroIdDePersona(ctx.personId);
  if (!propio) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
  const dueno = await repo.maestroDeSeccionMateria(seccionMateriaId);
  if (dueno !== propio) throw new DomainError('Solo puede gestionar materias asignadas a usted', 403, 'NO_ES_SU_MATERIA');
}

r.get('/periodos', asyncHandler(async (req, res) => {
  const q = z.object({ gradoId: z.string().uuid(), anioLectivoId: z.string().uuid().optional() }).parse(req.query);
  res.json({ success: true, data: await repo.listarPeriodos(q.gradoId, q.anioLectivoId) });
}));

r.get('/actividades', docente, asyncHandler(async (req, res) => {
  const filtro = z
    .object({ seccionMateriaId: z.string().uuid().optional(), periodoEvaluacionId: z.string().uuid().optional() })
    .parse(req.query);
  res.json({ success: true, data: await repo.listarActividades(filtro) });
}));

r.post('/actividades', docente, asyncHandler(async (req, res) => {
  const dto = actividadSchema.parse(req.body);
  const ctx = getUserContext(req);
  await exigirPropiedadSeccionMateria(req, dto.seccionMateriaId);
  res.status(201).json({ success: true, data: await crearActividad.execute(dto, ctx.userId) });
}));

r.get('/actividades/:id/notas', docente, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await repo.listarNotasDeActividad(req.params.id) });
}));

r.post('/actividades/:id/calificar', docente, asyncHandler(async (req, res) => {
  const dto = calificarSchema.parse(req.body);
  const ctx = getUserContext(req);
  if (ctx.role === 'MAESTRO') {
    const propio = await repo.maestroIdDePersona(ctx.personId);
    if (!propio) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
    const dueno = await repo.maestroDeActividad(req.params.id);
    if (dueno !== propio) throw new DomainError('Solo puede calificar actividades de sus materias', 403, 'NO_ES_SU_MATERIA');
  }
  res.json({
    success: true,
    data: await calificarNota.execute({ actividadId: req.params.id, ...dto }, ctx.userId),
  });
}));

// Resumen de promedios y proyección por materia para un alumno
// (los responsables solo deberían consultarlo vía el endpoint del portal de padres)
r.get('/alumnos/:alumnoId/resumen', asyncHandler(async (req, res) => {
  const q = z.object({ anioLectivoId: z.string().uuid() }).parse(req.query);
  res.json({ success: true, data: await repo.resumenAlumno(req.params.alumnoId, q.anioLectivoId) });
}));

// Proyección puntual de una materia/periodo
r.get('/proyeccion', asyncHandler(async (req, res) => {
  const q = z
    .object({ alumnoId: z.string().uuid(), seccionMateriaId: z.string().uuid(), periodoEvaluacionId: z.string().uuid() })
    .parse(req.query);
  const [actividades, notaMinima] = await Promise.all([
    repo.actividadesCalificadasDeAlumno(q.alumnoId, q.seccionMateriaId, q.periodoEvaluacionId),
    repo.notaMinimaDeSeccionMateria(q.seccionMateriaId),
  ]);
  res.json({ success: true, data: resumenPeriodo(actividades, notaMinima) });
}));

app.use('/api/calificaciones', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`calificaciones-service escuchando en puerto ${env.PORT}`));
