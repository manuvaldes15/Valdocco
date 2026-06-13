import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger } from '@valdocco/logger';
import {
  HEADER_INTERNAL_SECRET,
  HEADER_PERSON_ID,
  HEADER_USER_ID,
  HEADER_USER_ROLE,
  JwtPayload,
} from '@valdocco/shared-types';
import { env } from './config/env';

const logger = createLogger('gateway');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// Rate limiting global + estricto para autenticación (mitiga fuerza bruta)
app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiados intentos, espere unos minutos' } },
});
app.use('/api/auth/login', authLimiter);

app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'gateway', status: 'ok' } }));

// Rutas públicas que no requieren JWT
const PUBLIC_PATHS: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/ },
  { method: 'POST', pattern: /^\/api\/auth\/refresh$/ },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/ },
  { method: 'GET', pattern: /^\/api\/calendario\/publico(\/.*)?$/ },
];

function isPublic(req: Request): boolean {
  return PUBLIC_PATHS.some((p) => p.method === req.method && p.pattern.test(req.path));
}

// Autenticación JWT — se ejecuta antes de todo proxy
function authenticate(req: Request, res: Response, next: NextFunction) {
  // Nunca confiar en headers internos provenientes del exterior
  delete req.headers[HEADER_USER_ID];
  delete req.headers[HEADER_USER_ROLE];
  delete req.headers[HEADER_PERSON_ID];
  delete req.headers[HEADER_INTERNAL_SECRET];

  if (isPublic(req)) {
    req.headers[HEADER_INTERNAL_SECRET] = env.INTERNAL_SECRET;
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, error: { code: 'NO_AUTENTICADO', message: 'Token de acceso requerido' } });
  }
  try {
    const payload = jwt.verify(auth.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    req.headers[HEADER_USER_ID] = payload.sub;
    req.headers[HEADER_USER_ROLE] = payload.role;
    req.headers[HEADER_PERSON_ID] = payload.personId;
    req.headers[HEADER_INTERNAL_SECRET] = env.INTERNAL_SECRET;
    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, error: { code: 'TOKEN_INVALIDO', message: 'Token inválido o expirado' } });
  }
}

app.use(authenticate);

// Tabla de enrutamiento → microservicios (red interna de Docker)
const routes: { prefix: string; target: string }[] = [
  { prefix: '/api/auth', target: env.AUTH_SERVICE_URL },
  { prefix: '/api/personas', target: env.PERSONAS_SERVICE_URL },
  { prefix: '/api/academico', target: env.ACADEMICO_SERVICE_URL },
  { prefix: '/api/inscripciones', target: env.INSCRIPCIONES_SERVICE_URL },
  { prefix: '/api/calificaciones', target: env.CALIFICACIONES_SERVICE_URL },
  { prefix: '/api/horarios', target: env.HORARIOS_SERVICE_URL },
  { prefix: '/api/calendario', target: env.CALENDARIO_SERVICE_URL },
  { prefix: '/api/notificaciones', target: env.NOTIFICACIONES_SERVICE_URL },
  { prefix: '/api/reportes', target: env.REPORTES_SERVICE_URL },
];

for (const { prefix, target } of routes) {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      // express recorta el prefijo de montaje; el servicio espera la ruta completa
      pathRewrite: (path) => `${prefix}${path}`,
      on: {
        error: (err, _req, res) => {
          logger.error(`Proxy hacia ${target} falló`, { error: err.message });
          if ('writeHead' in res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: { code: 'SERVICIO_NO_DISPONIBLE', message: 'El servicio no está disponible' },
              })
            );
          }
        },
      },
    })
  );
}

app.use((_req, res) =>
  res.status(404).json({ success: false, error: { code: 'NO_ENCONTRADO', message: 'Ruta no encontrada' } })
);

app.listen(env.PORT, () => logger.info(`Gateway escuchando en puerto ${env.PORT}`));
