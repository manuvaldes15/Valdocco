import { IUsuarioAuthRepository } from '../../domain/repositories/IUsuarioAuthRepository';

export class LogoutUseCase {
  constructor(private readonly usuarios: IUsuarioAuthRepository) {}

  async execute(userId: string | null): Promise<void> {
    if (!userId) return; // logout idempotente
    await this.usuarios.saveRefreshTokenHash(userId, null);
  }
}
