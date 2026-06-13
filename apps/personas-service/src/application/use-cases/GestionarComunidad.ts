import { DomainError } from '@valdocco/shared-types';
import { IAuditoriaRepository, IPersonasRepository, PersonaData } from '../../domain/repositories/IPersonasRepository';

export interface IPasswordHasher {
  hash(plano: string): Promise<string>;
}

export class CrearMaestroUseCase {
  constructor(private readonly repo: IPersonasRepository) {}

  execute(
    persona: PersonaData,
    detalle: { codigoMaestro?: string; especializacion?: string; tipoContrato?: string },
    userId: string
  ) {
    return this.repo.crearMaestro(persona, detalle, userId);
  }
}

export class CrearResponsableUseCase {
  constructor(private readonly repo: IPersonasRepository) {}

  execute(persona: PersonaData, tipoRelacion: string, userId: string) {
    return this.repo.crearResponsable(persona, tipoRelacion, userId);
  }
}

export class VincularResponsableUseCase {
  constructor(private readonly repo: IPersonasRepository) {}

  execute(alumnoId: string, responsableId: string, esPrincipal: boolean, userId: string) {
    return this.repo.vincularResponsable(alumnoId, responsableId, esPrincipal, userId);
  }
}

export class CrearUsuarioUseCase {
  constructor(
    private readonly repo: IPersonasRepository,
    private readonly hasher: IPasswordHasher,
    private readonly auditoria: IAuditoriaRepository
  ) {}

  async execute(
    input: { personaId: string; nombreUsuario: string; email: string; contrasena: string; rol: string },
    userId: string
  ) {
    if (input.contrasena.length < 10) {
      throw new DomainError('La contraseña debe tener al menos 10 caracteres', 400, 'CONTRASENA_DEBIL');
    }
    const yaExiste = await this.repo.existeUsuario(input.email.toLowerCase(), input.nombreUsuario);
    if (yaExiste) throw new DomainError('El correo o nombre de usuario ya está registrado', 409, 'USUARIO_DUPLICADO');

    const contrasenaHash = await this.hasher.hash(input.contrasena);
    const usuario = (await this.repo.crearUsuario(
      {
        personaId: input.personaId,
        nombreUsuario: input.nombreUsuario,
        email: input.email.toLowerCase(),
        contrasenaHash,
        rol: input.rol,
      },
      userId
    )) as { id: string };
    await this.auditoria.registrar(userId, 'usuarios', usuario.id, 'INSERT');
    return usuario;
  }
}
