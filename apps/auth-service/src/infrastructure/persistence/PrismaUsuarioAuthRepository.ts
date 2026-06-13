import { getPrisma } from '@valdocco/prisma-client';
import { Rol } from '@valdocco/shared-types';
import { IUsuarioAuthRepository } from '../../domain/repositories/IUsuarioAuthRepository';
import { UsuarioAuth } from '../../domain/entities/UsuarioAuth';

type UsuarioConPersona = {
  id: string;
  personaId: string;
  nombreUsuario: string;
  email: string;
  contrasenaHash: string;
  rol: string;
  activo: boolean;
  refreshTokenHash: string | null;
  persona: { primerNombre: string; primerApellido: string };
};

function toEntity(u: UsuarioConPersona): UsuarioAuth {
  return {
    id: u.id,
    personaId: u.personaId,
    nombreUsuario: u.nombreUsuario,
    email: u.email,
    contrasenaHash: u.contrasenaHash,
    rol: u.rol as Rol,
    activo: u.activo,
    refreshTokenHash: u.refreshTokenHash,
    nombreCompleto: `${u.persona.primerNombre} ${u.persona.primerApellido}`,
  };
}

export class PrismaUsuarioAuthRepository implements IUsuarioAuthRepository {
  private prisma = getPrisma();

  async findByEmail(email: string): Promise<UsuarioAuth | null> {
    const u = await this.prisma.usuario.findFirst({
      where: { email, fechaElim: null },
      include: { persona: { select: { primerNombre: true, primerApellido: true } } },
    });
    return u ? toEntity(u) : null;
  }

  async findById(id: string): Promise<UsuarioAuth | null> {
    const u = await this.prisma.usuario.findFirst({
      where: { id, fechaElim: null },
      include: { persona: { select: { primerNombre: true, primerApellido: true } } },
    });
    return u ? toEntity(u) : null;
  }

  async saveRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.prisma.usuario.update({ where: { id: userId }, data: { refreshTokenHash: hash } });
  }

  async savePasswordHash(userId: string, hash: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id: userId }, data: { contrasenaHash: hash } });
  }

  async registrarAcceso(userId: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id: userId }, data: { ultimoAcceso: new Date() } });
  }
}
