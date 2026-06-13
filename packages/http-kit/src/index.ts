import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  DomainError,
  HEADER_INTERNAL_SECRET,
  HEADER_PERSON_ID,
  HEADER_USER_ID,
  HEADER_USER_ROLE,
  Rol,
} from '@valdocco/shared-types';
import type { Logger } from '@valdocco/logger';
import { timingSafeEqual } from 'crypto';

/** Contexto del usuario autenticado, inyectado por el gateway en headers internos. */
export interface UserContext {
  userId: string;
  role: Rol;
  personId: string;
}

export function getUserContext(req: Request): UserContext {
  const userId = req.headers[HEADER_USER_ID] as string | undefined;
  const role = req.headers[HEADER_USER_ROLE] as Rol | undefined;
  const personId = req.headers[HEADER_PERSON_ID] as string | undefined;
  if (!userId || !role) {
    throw new DomainError('Contexto de usuario ausente', 401, 'NO_AUTENTICADO');
  }
  return { userId, role, personId: personId ?? '' };
}

function safeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Middleware de defensa en profundidad: rechaza cualquier request que no
 * provenga del gateway (que es el único que conoce INTERNAL_SECRET).
 */
export function internalAuth(internalSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = req.headers[HEADER_INTERNAL_SECRET] as string | undefined;
    if (!provided || !safeEquals(provided, internalSecret)) {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESO_DIRECTO_PROHIBIDO', message: 'Acceso permitido solo a través del gateway' },
      });
      return;
    }
    next();
  };
}

/** Restringe un endpoint a ciertos roles. */
export function requireRoles(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ctx = getUserContext(req);
    if (!roles.includes(ctx.role)) {
      next(new DomainError('No tiene permisos para esta operación', 403, 'PROHIBIDO'));
      return;
    }
    next();
  };
}

/** Manejador de errores estándar: DomainError → status tipado, Zod → 422, resto → 500. */
export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) {
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    if (err instanceof ZodError) {
      res.status(422).json({
        success: false,
        error: { code: 'VALIDACION', message: 'Datos de entrada inválidos', details: err.flatten().fieldErrors },
      });
      return;
    }
    logger.error('Error no controlado', { error: err instanceof Error ? err.stack : String(err) });
    res.status(500).json({ success: false, error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' } });
  };
}

/** Envuelve handlers async para propagar errores a errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
