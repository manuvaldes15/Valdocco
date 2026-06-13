import { Rol } from '@valdocco/shared-types';

/** Puertos de salida para criptografía y tokens — implementados en infrastructure. */
export interface IPasswordHasher {
  hash(plano: string): Promise<string>;
  compare(plano: string, hash: string): Promise<boolean>;
}

export interface ITokenIssuer {
  issueAccessToken(payload: { sub: string; role: Rol; personId: string }): string;
  /** Genera un refresh token opaco y su hash para persistir. */
  issueRefreshToken(): { token: string; hash: string };
  hashRefreshToken(token: string): string;
}
