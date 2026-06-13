import express from 'express';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, getUserContext, internalAuth, requireRoles } from '@valdocco/http-kit';
import { DomainError } from '@valdocco/shared-types';
import { env } from './infrastructure/config/env';
import { PrismaReportesRepository } from './infrastructure/persistence/PrismaReportesRepository';
import { generarLibretaPdf } from './infrastructure/pdf/LibretaPdf';

const logger = createLogger('reportes-service');
const repo = new PrismaReportesRepository();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'reportes-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();

r.get('/dashboard/director', requireRoles('ADMIN', 'DIRECTOR'), asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await repo.kpisDirector() });
}));

r.get('/dashboard/maestro', requireRoles('MAESTRO', 'ADMIN', 'DIRECTOR'), asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  const data = await repo.kpisMaestro(ctx.personId);
  if (!data) throw new DomainError('El usuario no es un maestro registrado', 404, 'NO_ES_MAESTRO');
  res.json({ success: true, data });
}));

// Libreta de calificaciones en PDF
// Gestión y maestros: cualquier alumno. Responsables: solo sus hijos vinculados.
r.get('/libreta/:alumnoId', asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  if (ctx.role === 'RESPONSABLE') {
    const autorizado = await repo.esResponsableDe(ctx.personId, req.params.alumnoId);
    if (!autorizado) throw new DomainError('No tiene permisos sobre este alumno', 403, 'PROHIBIDO');
  } else if (!['ADMIN', 'DIRECTOR', 'MAESTRO'].includes(ctx.role)) {
    throw new DomainError('No tiene permisos para esta operación', 403, 'PROHIBIDO');
  }

  const datos = await repo.datosLibreta(req.params.alumnoId);
  if (!datos) {
    throw new DomainError('El alumno no tiene inscripción activa en el año lectivo vigente', 404, 'SIN_INSCRIPCION');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="libreta-${datos.alumno.codigo}.pdf"`);
  generarLibretaPdf(datos).pipe(res);
}));

app.use('/api/reportes', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`reportes-service escuchando en puerto ${env.PORT}`));
