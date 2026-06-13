import { DomainError } from '@valdocco/shared-types';
import { IUsuarioAuthRepository } from '../../domain/repositories/IUsuarioAuthRepository';
import { validarPoliticaContrasena } from '../../domain/services/PasswordPolicy';
import { IPasswordHasher } from '../ports';
import { CambiarContrasenaInput } from '../dtos/auth.dto';

export class CambiarContrasenaUseCase {
  constructor(
    private readonly usuarios: IUsuarioAuthRepository,
    private readonly hasher: IPasswordHasher
  ) {}

  async execute(userId: string, input: CambiarContrasenaInput): Promise<void> {
    const usuario = await this.usuarios.findById(userId);
    if (!usuario) throw new DomainError('Usuario no encontrado', 404, 'NO_ENCONTRADO');

    const ok = await this.hasher.compare(input.contrasenaActual, usuario.contrasenaHash);
    if (!ok) throw new DomainError('La contraseña actual es incorrecta', 401, 'CREDENCIALES_INVALIDAS');

    validarPoliticaContrasena(input.contrasenaNueva);
    const nuevoHash = await this.hasher.hash(input.contrasenaNueva);
    await this.usuarios.savePasswordHash(userId, nuevoHash);
    // Cerrar las demás sesiones al cambiar la contraseña
    await this.usuarios.saveRefreshTokenHash(userId, null);
  }
}
