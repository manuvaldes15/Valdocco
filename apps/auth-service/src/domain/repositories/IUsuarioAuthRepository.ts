import { UsuarioAuth } from '../entities/UsuarioAuth';

/** Puerto de salida — la implementación Prisma vive en infrastructure/persistence. */
export interface IUsuarioAuthRepository {
  findByEmail(email: string): Promise<UsuarioAuth | null>;
  findById(id: string): Promise<UsuarioAuth | null>;
  saveRefreshTokenHash(userId: string, hash: string | null): Promise<void>;
  savePasswordHash(userId: string, hash: string): Promise<void>;
  registrarAcceso(userId: string): Promise<void>;
}
