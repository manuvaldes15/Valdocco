import { Rol } from '@valdocco/shared-types';

export interface LoginInput {
  email: string;
  contrasena: string;
}

export interface SesionOutput {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    nombreUsuario: string;
    email: string;
    rol: Rol;
    personaId: string;
    nombreCompleto: string;
  };
}

export interface CambiarContrasenaInput {
  contrasenaActual: string;
  contrasenaNueva: string;
}
