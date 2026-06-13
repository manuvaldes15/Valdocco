import express from 'express';
import cookieParser from 'cookie-parser';
import { createLogger } from '@valdocco/logger';
import { asyncHandler, errorHandler, internalAuth } from '@valdocco/http-kit';
import { env } from './infrastructure/config/env';
import { PrismaUsuarioAuthRepository } from './infrastructure/persistence/PrismaUsuarioAuthRepository';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher';
import { JwtTokenIssuer } from './infrastructure/security/JwtTokenIssuer';
import { LoginUseCase } from './application/use-cases/Login';
import { RefreshTokenUseCase } from './application/use-cases/RefreshToken';
import { LogoutUseCase } from './application/use-cases/Logout';
import { CambiarContrasenaUseCase } from './application/use-cases/CambiarContrasena';
import { AuthController } from './infrastructure/http/controllers/auth.controller';

const logger = createLogger('auth-service');

// ── Composición raíz: inyección de dependencias ──
const usuarios = new PrismaUsuarioAuthRepository();
const hasher = new BcryptPasswordHasher();
const tokens = new JwtTokenIssuer();
const controller = new AuthController(
  new LoginUseCase(usuarios, hasher, tokens),
  new RefreshTokenUseCase(usuarios, tokens),
  new LogoutUseCase(usuarios),
  new CambiarContrasenaUseCase(usuarios, hasher)
);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ success: true, data: { service: 'auth-service', status: 'ok' } }));

app.use(internalAuth(env.INTERNAL_SECRET));

const router = express.Router();
router.post('/login', asyncHandler(controller.postLogin));
router.post('/refresh', asyncHandler(controller.postRefresh));
router.post('/logout', asyncHandler(controller.postLogout));
router.post('/cambiar-contrasena', asyncHandler(controller.postCambiarContrasena));
app.use('/api/auth', router);

app.use(errorHandler(logger));

app.listen(env.PORT, () => logger.info(`auth-service escuchando en puerto ${env.PORT}`));
