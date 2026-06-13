import { Rol } from '@valdocco/shared-types';

/** Entidad de dominio pura — sin decoradores ORM. */
export interface UsuarioAuth {
  id: string;
  personaId: string;
  nombreUsuario: string;
  email: string;
  contrasenaHash: string;
  rol: Rol;
  activo: boolean;
  refreshTokenHash: string | null;
  nombreCompleto: string;
}
