import express from 'express';
import Redis from 'ioredis';
import { z } from 'zod';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, getUserContext, internalAuth } from '@valdocco/http-kit';
import { CHANNEL_NOTIFICACIONES, EventoNotificacion } from '@valdocco/shared-types';
import { getPrisma } from '@valdocco/prisma-client';
import { env } from './infrastructure/config/env';

const logger = createLogger('notificaciones-service');
const prisma = getPrisma();

// ── Consumer Redis: persiste cada evento como notificación en bandeja ──
const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
subscriber.subscribe(CHANNEL_NOTIFICACIONES, (err) => {
  if (err) logger.error('No se pudo suscribir al canal de notificaciones', { error: err.message });
  else logger.info(`Suscrito al canal ${CHANNEL_NOTIFICACIONES}`);
});

subscriber.on('message', async (_channel, message) => {
  try {
    const evento = JSON.parse(message) as EventoNotificacion;
    if (evento.destinatarioPersonaIds.length === 0) return; // broadcast aún no soportado
    await prisma.notificacion.createMany({
      data: evento.destinatarioPersonaIds.map((personaId) => ({
        personaId,
        tipo: evento.tipo,
        titulo: evento.titulo,
        mensaje: evento.mensaje,
        referenciaId: evento.referenciaId ?? null,
      })),
    });
    logger.info(`Notificación ${evento.tipo} entregada a ${evento.destinatarioPersonaIds.length} persona(s)`);
  } catch (error) {
    logger.error('Error procesando evento de notificación', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ── API de bandeja: cada usuario consulta SOLO sus notificaciones ──
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'notificaciones-service', status: 'ok' } }));
app.use(internalAuth(env.INTERNAL_SECRET));

const r = express.Router();

r.get('/', asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  const q = z.object({ soloNoLeidas: z.coerce.boolean().default(false) }).parse(req.query);
  const items = await prisma.notificacion.findMany({
    where: { personaId: ctx.personId, ...(q.soloNoLeidas ? { leidaEn: null } : {}) },
    orderBy: { fechaCrea: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: items });
}));

r.post('/:id/leer', asyncHandler(async (req, res) => {
  const ctx = getUserContext(req);
  // updateMany con personaId evita que un usuario marque notificaciones ajenas
  await prisma.notificacion.updateMany({
    where: { id: req.params.id, personaId: ctx.personId },
    data: { leidaEn: new Date() },
  });
  res.json({ success: true, data: { mensaje: 'Notificación leída' } });
}));

app.use('/api/notificaciones', r);
app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`notificaciones-service escuchando en puerto ${env.PORT}`));
