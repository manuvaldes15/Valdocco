import { DomainError } from '@valdocco/shared-types';
import { IUsuarioAuthRepository } from '../../domain/repositories/IUsuarioAuthRepository';
import { IPasswordHasher, ITokenIssuer } from '../ports';
import { LoginInput, SesionOutput } from '../dtos/auth.dto';

export class LoginUseCase {
  constructor(
    private readonly usuarios: IUsuarioAuthRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenIssuer
  ) {}

  async execute(input: LoginInput): Promise<SesionOutput> {
    const usuario = await this.usuarios.findByEmail(input.email.toLowerCase().trim());
    // Mensaje genérico: no revelar si el correo existe o no
    const credencialesInvalidas = new DomainError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS');
    if (!usuario || !usuario.activo) throw credencialesInvalidas;

    const ok = await this.hasher.compare(input.contrasena, usuario.contrasenaHash);
    if (!ok) throw credencialesInvalidas;

    const accessToken = this.tokens.issueAccessToken({
      sub: usuario.id,
      role: usuario.rol,
      personId: usuario.personaId,
    });
    const { token: refreshToken, hash } = this.tokens.issueRefreshToken();
    await this.usuarios.saveRefreshTokenHash(usuario.id, hash);
    await this.usuarios.registrarAcceso(usuario.id);

    return {
      accessToken,
      refreshToken,
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
