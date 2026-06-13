import express from 'express';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { DomainError } from '@valdocco/shared-types';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaInscripcionRepository } from './infrastructure/persistence/PrismaInscripcionRepository';
import {
  CambiarTurnoUseCase,
  MatricularAlumnoUseCase,
  RetirarAlumnoUseCase,
} from './application/use-cases/GestionarInscripcion';

const logger = createLogger('inscripciones-service');

const repo = new PrismaInscripcionRepository();
const matricular = new MatricularAlumnoUseCase(repo);
const retirar = new RetirarAlumnoUseCase(repo);
const cambiarTurno = new CambiarTurnoUseCase(repo);

const matriculaSchema = z.object({
  alumnoId: z.string().uuid(),
  seccionId: z.string().uuid(),
  anioLectivoId: z.string().uuid(),
  // Opcional: cuando el que matricula es un MAESTRO, él mismo queda como guía.
  maestroGuiaId: z.string().uuid().optional(),
  fechaInscripcion: z.coerce.date(),
});

const retiroSchema = z.object({
  fechaRetiro: z.coerce.date(),
  motivo: z.string().min(3).max(1000),
});

const cambioTurnoSchema = z.object({
  nuevaSeccionId: z.string().uuid(),
  turno: z.enum(['MANANA', 'TARDE']),
  fecha: z.coerce.date(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'inscripciones-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const gestion = requireRoles('ADMIN', 'DIRECTOR');
const matriculaRoles = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');
const lectura = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');

r.get('/', lectura, asyncHandler(async (req, res) => {
  const q = z
    .object({
      seccionId: z.string().uuid().optional(),
      anioLectivoId: z.string().uuid().optional(),
      estado: z.enum(['ACTIVO', 'RETIRADO', 'TRASLADADO', 'GRADUADO']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(req.query);
  const { page, limit, ...filtro } = q;
  const { items, total } = await repo.listar(filtro, page, limit);
  res.json({ success: true, data: items, meta: { total, page, limit } });
}));

r.post('/', matriculaRoles, asyncHandler(async (req, res) => {
  const dto = matriculaSchema.parse(req.body);
  const ctx = getUserContext(req);

  // Un MAESTRO solo puede matricular asignándose a sí mismo como guía (registra a sus alumnos).
  let maestroGuiaId = dto.maestroGuiaId;
  if (ctx.role === 'MAESTRO') {
    const propio = await repo.maestroIdDePersona(ctx.personId);
    if (!propio) throw new DomainError('Su usuario no está vinculado a un maestro', 403, 'NO_ES_MAESTRO');
    maestroGuiaId = propio;
  } else if (!maestroGuiaId) {
    throw new DomainError('Debe indicar el maestro guía de la sección', 400, 'GUIA_REQUERIDO');
  }

  const data = { ...dto, maestroGuiaId };
  res.status(201).json({ success: true, data: await matricular.execute(data, ctx.userId) });
}));

r.post('/:id/retirar', gestion, asyncHandler(async (req, res) => {
  const dto = retiroSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.json({ success: true, data: await retirar.execute(req.params.id, dto.fechaRetiro, dto.motivo, ctx.userId) });
}));

r.post('/:id/cambiar-turno', gestion, asyncHandler(async (req, res) => {
  const dto = cambioTurnoSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.json({
    success: true,
    data: await cambiarTurno.execute(req.params.id, dto.nuevaSeccionId, dto.turno, dto.fecha, ctx.userId),
  });
}));

app.use('/api/inscripciones', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`inscripciones-service escuchando en puerto ${env.PORT}`));
