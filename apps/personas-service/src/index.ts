import express from 'express';
import * as bcrypt from 'bcryptjs';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaAuditoriaRepository, PrismaPersonasRepository } from './infrastructure/persistence/PrismaPersonasRepository';
import { PersonasQueries } from './application/queries/PersonasQueries';
import { ActualizarAlumnoUseCase, CrearAlumnoUseCase, EliminarAlumnoUseCase, RegistrarHijoUseCase } from './application/use-cases/GestionarAlumno';
import {
  CrearMaestroUseCase,
  CrearResponsableUseCase,
  CrearUsuarioUseCase,
  VincularResponsableUseCase,
} from './application/use-cases/GestionarComunidad';
import {
  crearAlumnoSchema,
  crearMaestroSchema,
  crearResponsableSchema,
  crearUsuarioSchema,
  paginacionSchema,
  vincularSchema,
} from './infrastructure/http/schemas';

const logger = createLogger('personas-service');

// ── Composición raíz ──
const repo = new PrismaPersonasRepository();
const auditoria = new PrismaAuditoriaRepository();
const queries = new PersonasQueries(repo);
const crearAlumno = new CrearAlumnoUseCase(repo, auditoria);
const registrarHijo = new RegistrarHijoUseCase(repo, auditoria);
const actualizarAlumno = new ActualizarAlumnoUseCase(repo, auditoria);
const eliminarAlumno = new EliminarAlumnoUseCase(repo, auditoria);
const crearMaestro = new CrearMaestroUseCase(repo);
const crearResponsable = new CrearResponsableUseCase(repo);
const vincular = new VincularResponsableUseCase(repo);
const crearUsuario = new CrearUsuarioUseCase(repo, { hash: (p) => bcrypt.hash(p, 12) }, auditoria);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'personas-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();
const soloGestion = requireRoles('ADMIN', 'DIRECTOR');
const lectura = requireRoles('ADMIN', 'DIRECTOR', 'MAESTRO');

r.get('/alumnos', lectura, asyncHandler(async (req, res) => {
  const p = paginacionSchema.parse(req.query);
  const { items, total } = await queries.listarAlumnos(p);
  res.json({ success: true, data: items, meta: { total, page: p.page, limit: p.limit } });
}));

r.get('/alumnos/:id', lectura, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await queries.obtenerAlumno(req.params.id) });
}));

r.post('/alumnos', soloGestion, asyncHandler(async (req, res) => {
  const dto = crearAlumnoSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearAlumno.execute(dto.persona, dto.detalle, ctx.userId) });
}));

r.put('/alumnos/:id', soloGestion, asyncHandler(async (req, res) => {
  const dto = crearAlumnoSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.json({ success: true, data: await actualizarAlumno.execute(req.params.id, dto.persona, dto.detalle, ctx.userId) });
}));

r.delete('/alumnos/:id', soloGestion, asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  await eliminarAlumno.execute(req.params.id, ctx.userId);
  res.json({ success: true, data: { mensaje: 'Alumno eliminado' } });
}));

r.get('/maestros', lectura, asyncHandler(async (req, res) => {
  const p = paginacionSchema.parse(req.query);
  const { items, total } = await queries.listarMaestros(p);
  res.json({ success: true, data: items, meta: { total, page: p.page, limit: p.limit } });
}));

r.post('/maestros', soloGestion, asyncHandler(async (req, res) => {
  const dto = crearMaestroSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearMaestro.execute(dto.persona, dto.detalle, ctx.userId) });
}));

r.get('/responsables', lectura, asyncHandler(async (req, res) => {
  const p = paginacionSchema.parse(req.query);
  const { items, total } = await queries.listarResponsables(p);
  res.json({ success: true, data: items, meta: { total, page: p.page, limit: p.limit } });
}));

r.post('/responsables', soloGestion, asyncHandler(async (req, res) => {
  const dto = crearResponsableSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearResponsable.execute(dto.persona, dto.tipoRelacion, ctx.userId) });
}));

r.post('/responsables/vincular', soloGestion, asyncHandler(async (req, res) => {
  const dto = vincularSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await vincular.execute(dto.alumnoId, dto.responsableId, dto.esPrincipal, ctx.userId) });
}));

// Portal de padres: el responsable autenticado consulta SOLO sus propios hijos
r.get('/mis-hijos', requireRoles('RESPONSABLE'), asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  res.json({ success: true, data: await queries.misHijos(ctx.personId) });
}));

// Portal de padres: el responsable registra a su propio hijo (queda vinculado como principal)
r.post('/mis-hijos', requireRoles('RESPONSABLE'), asyncHandler(async (req, res) => {
  const dto = crearAlumnoSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await registrarHijo.execute(dto.persona, dto.detalle, ctx.personId, ctx.userId) });
}));

r.post('/usuarios', requireRoles('ADMIN', 'DIRECTOR'), asyncHandler(async (req, res) => {
  const dto = crearUsuarioSchema.parse(req.body);
  const ctx = getUserContext(req);
  res.status(201).json({ success: true, data: await crearUsuario.execute(dto, ctx.userId) });
}));

app.use('/api/personas', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`personas-service escuchando en puerto ${env.PORT}`));
