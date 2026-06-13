import { DomainError } from '@valdocco/shared-types';
import { IUsuarioAuthRepository } from '../../domain/repositories/IUsuarioAuthRepository';
import { ITokenIssuer } from '../ports';
import { SesionOutput } from '../dtos/auth.dto';

export class RefreshTokenUseCase {
  constructor(
    private readonly usuarios: IUsuarioAuthRepository,
    private readonly tokens: ITokenIssuer
  ) {}

  /** Rota el refresh token: el anterior queda invalidado en cada uso. */
  async execute(userId: string, refreshToken: string): Promise<SesionOutput> {
    const invalida = new DomainError('Sesión inválida o expirada', 401, 'SESION_INVALIDA');
    if (!userId || !refreshToken) throw invalida;

    const usuario = await this.usuarios.findById(userId);
    if (!usuario || !usuario.activo || !usuario.refreshTokenHash) throw invalida;

    const hashRecibido = this.tokens.hashRefreshToken(refreshToken);
    if (hashRecibido !== usuario.refreshTokenHash) {
      // Posible reutilización de token robado: invalidar la sesión por completo
      await this.usuarios.saveRefreshTokenHash(usuario.id, null);
      throw invalida;
    }

    const accessToken = this.tokens.issueAccessToken({
      sub: usuario.id,
      role: usuario.rol,
      personId: usuario.personaId,
    });
    const { token: nuevoRefresh, hash } = this.tokens.issueRefreshToken();
    await this.usuarios.saveRefreshTokenHash(usuario.id, hash);

    return {
      accessToken,
      refreshToken: nuevoRefresh,
      usuario: {
        id: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        email: usuario.email,
        rol: usuario.rol,
        personaId: usuario.personaId,
        nombreCompleto: usuario.nombreCompleto,
      },
    };
  }
}
