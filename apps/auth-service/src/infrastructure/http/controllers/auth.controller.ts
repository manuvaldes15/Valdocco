import { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { HEADER_USER_ID } from '@valdocco/shared-types';
import { LoginUseCase } from '../../../application/use-cases/Login';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshToken';
import { LogoutUseCase } from '../../../application/use-cases/Logout';
import { CambiarContrasenaUseCase } from '../../../application/use-cases/CambiarContrasena';
import { SesionOutput } from '../../../application/dtos/auth.dto';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email().max(200),
  contrasena: z.string().min(1).max(200),
});

const cambiarContrasenaSchema = z.object({
  contrasenaActual: z.string().min(1).max(200),
  contrasenaNueva: z.string().min(1).max(200),
});

const COOKIE_NAME = 'valdocco_refresh';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

function enviarSesion(res: Response, sesion: SesionOutput, status = 200) {
  // El refresh token viaja SOLO en cookie httpOnly (inaccesible a JS del navegador)
  res.cookie(COOKIE_NAME, `${sesion.usuario.id}.${sesion.refreshToken}`, cookieOptions);
  res.status(status).json({
    success: true,
    data: { accessToken: sesion.accessToken, usuario: sesion.usuario },
  });
}

export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly cambiarContrasena: CambiarContrasenaUseCase
  ) {}

  postLogin = async (req: Request, res: Response) => {
    const dto = loginSchema.parse(req.body);
    const sesion = await this.login.execute(dto);
    enviarSesion(res, sesion);
  };

  postRefresh = async (req: Request, res: Response) => {
    const raw: string | undefined = req.cookies?.[COOKIE_NAME];
    const dot = raw?.indexOf('.') ?? -1;
    const userId = dot > 0 ? raw!.slice(0, dot) : '';
    const token = dot > 0 ? raw!.slice(dot + 1) : '';
    const sesion = await this.refresh.execute(userId, token);
    enviarSesion(res, sesion);
  };

  postLogout = async (req: Request, res: Response) => {
    const raw: string | undefined = req.cookies?.[COOKIE_NAME];
    const userId = raw?.includes('.') ? raw.slice(0, raw.indexOf('.')) : null;
    await this.logout.execute(userId);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
    res.json({ success: true, data: { mensaje: 'Sesión cerrada' } });
  };

  postCambiarContrasena = async (req: Request, res: Response) => {
    const dto = cambiarContrasenaSchema.parse(req.body);
    const userId = req.headers[HEADER_USER_ID] as string;
    await this.cambiarContrasena.execute(userId, dto);
    res.json({ success: true, data: { mensaje: 'Contraseña actualizada' } });
  };
}
