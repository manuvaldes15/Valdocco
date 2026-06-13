import { getPrisma, Prisma } from '@valdocco/prisma-client';
import {
  AlumnoDetalleData,
  IAuditoriaRepository,
  IPersonasRepository,
  Paginacion,
  PersonaData,
} from '../../domain/repositories/IPersonasRepository';

const prisma = getPrisma();

function filtroNombre(buscar?: string): Prisma.PersonaWhereInput {
  if (!buscar) return {};
  return {
    OR: [
      { primerNombre: { contains: buscar, mode: 'insensitive' } },
      { primerApellido: { contains: buscar, mode: 'insensitive' } },
      { segundoApellido: { contains: buscar, mode: 'insensitive' } },
    ],
  };
}

export class PrismaPersonasRepository implements IPersonasRepository {
  async listarAlumnos(p: Paginacion) {
    const where: Prisma.AlumnoWhereInput = { fechaElim: null, persona: { fechaElim: null, ...filtroNombre(p.buscar) } };
    const [items, total] = await Promise.all([
      prisma.alumno.findMany({
        where,
        include: {
          persona: true,
          inscripciones: {
            where: { estado: 'ACTIVO', fechaElim: null },
            include: { seccion: { include: { grado: true } } },
          },
        },
        orderBy: { persona: { primerApellido: 'asc' } },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      prisma.alumno.count({ where }),
    ]);
    return { items, total };
  }

  async obtenerAlumno(id: string) {
    return prisma.alumno.findFirst({
      where: { id, fechaElim: null },
      include: {
        persona: true,
        responsables: { where: { fechaElim: null }, include: { responsable: { include: { persona: true } } } },
        inscripciones: {
          where: { fechaElim: null },
          include: { seccion: { include: { grado: true } }, anioLectivo: true },
        },
      },
    });
  }

  async crearAlumno(persona: PersonaData, detalle: AlumnoDetalleData, userId: string) {
    return prisma.$transaction(async (tx) => {
      const per = await tx.persona.create({ data: { ...persona, userCrea: userId } });
      const total = await tx.alumno.count();
      return tx.alumno.create({
        data: {
          personaId: per.id,
          codigoAlumno: `A26-${String(total + 1).padStart(4, '0')}`,
          ...detalle,
          userCrea: userId,
        },
        include: { persona: true },
      });
    });
  }

  async actualizarAlumno(id: string, persona: Partial<PersonaData>, detalle: AlumnoDetalleData, userId: string) {
    return prisma.$transaction(async (tx) => {
      const alumno = await tx.alumno.findFirstOrThrow({ where: { id, fechaElim: null } });
      await tx.persona.update({ where: { id: alumno.personaId }, data: { ...persona, userMod: userId } });
      return tx.alumno.update({
        where: { id },
        data: { ...detalle, userMod: userId },
        include: { persona: true },
      });
    });
  }

  async eliminarAlumno(id: string, userId: string) {
    await prisma.alumno.update({
      where: { id },
      data: { fechaElim: new Date(), userElim: userId },
    });
  }

  async listarMaestros(p: Paginacion) {
    const where: Prisma.MaestroWhereInput = { fechaElim: null, persona: { fechaElim: null, ...filtroNombre(p.buscar) } };
    const [items, total] = await Promise.all([
      prisma.maestro.findMany({
        where,
        include: { persona: true },
        orderBy: { persona: { primerApellido: 'asc' } },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      prisma.maestro.count({ where }),
    ]);
    return { items, total };
  }

  async crearMaestro(
    persona: PersonaData,
    detalle: { codigoMaestro?: string; especializacion?: string; tipoContrato?: string },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const per = await tx.persona.create({ data: { ...persona, userCrea: userId } });
      return tx.maestro.create({ data: { personaId: per.id, ...detalle, userCrea: userId }, include: { persona: true } });
    });
  }

  async listarResponsables(p: Paginacion) {
    const where: Prisma.ResponsableWhereInput = { fechaElim: null, persona: { fechaElim: null, ...filtroNombre(p.buscar) } };
    const [items, total] = await Promise.all([
      prisma.responsable.findMany({
        where,
        include: { persona: true, alumnos: { where: { fechaElim: null }, include: { alumno: { include: { persona: true } } } } },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      prisma.responsable.count({ where }),
    ]);
    return { items, total };
  }

  async crearResponsable(persona: PersonaData, tipoRelacion: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const per = await tx.persona.create({ data: { ...persona, userCrea: userId } });
      return tx.responsable.create({ data: { personaId: per.id, tipoRelacion, userCrea: userId }, include: { persona: true } });
    });
  }

  async vincularResponsable(alumnoId: string, responsableId: string, esPrincipal: boolean, userId: string) {
    return prisma.alumnoResponsable.upsert({
      where: { alumnoId_responsableId: { alumnoId, responsableId } },
      create: { alumnoId, responsableId, esPrincipal, userCrea: userId },
      update: { esPrincipal, fechaElim: null, userMod: userId },
    });
  }

  async crearHijoDeResponsable(
    persona: PersonaData,
    detalle: AlumnoDetalleData,
    personaIdResponsable: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Find-or-create del responsable a partir de su persona autenticada.
      let responsable = await tx.responsable.findFirst({
        where: { personaId: personaIdResponsable, fechaElim: null },
        select: { id: true },
      });
      if (!responsable) {
        responsable = await tx.responsable.create({
          data: { personaId: personaIdResponsable, tipoRelacion: 'TUTOR', userCrea: userId },
          select: { id: true },
        });
      }

      const per = await tx.persona.create({ data: { ...persona, userCrea: userId } });
      const total = await tx.alumno.count();
      const alumno = await tx.alumno.create({
        data: {
          personaId: per.id,
          codigoAlumno: `A26-${String(total + 1).padStart(4, '0')}`,
          ...detalle,
          userCrea: userId,
        },
        include: { persona: true },
      });

      await tx.alumnoResponsable.create({
        data: { alumnoId: alumno.id, responsableId: responsable.id, esPrincipal: true, puedeRecoger: true, userCrea: userId },
      });

      return alumno;
    });
  }

  async hijosDeResponsable(personaId: string) {
    const responsable = await prisma.responsable.findFirst({ where: { personaId, fechaElim: null } });
    if (!responsable) return [];
    const vinculos = await prisma.alumnoResponsable.findMany({
      where: { responsableId: responsable.id, fechaElim: null },
      include: {
        alumno: {
          include: {
            persona: true,
            inscripciones: {
              where: { estado: 'ACTIVO', fechaElim: null },
              include: { seccion: { include: { grado: true } } },
            },
          },
        },
      },
    });
    return vinculos.map((v) => v.alumno);
  }

  async crearUsuario(
    input: { personaId: string; nombreUsuario: string; email: string; contrasenaHash: string; rol: string },
    userId: string
  ) {
    const usuario = await prisma.usuario.create({ data: { ...input, userCrea: userId } });
    const { contrasenaHash: _omitido, refreshTokenHash: _omitido2, ...seguro } = usuario;
    return seguro;
  }

  async existeUsuario(email: string, nombreUsuario: string) {
    const u = await prisma.usuario.findFirst({
      where: { OR: [{ email }, { nombreUsuario }], fechaElim: null },
      select: { id: true },
    });
    return Boolean(u);
  }
}

export class PrismaAuditoriaRepository implements IAuditoriaRepository {
  async registrar(usuarioId: string, tabla: string, idRegistro: string, accion: string, anteriores?: unknown, nuevos?: unknown) {
    await prisma.registroAuditoria.create({
      data: {
        usuarioId,
        nombreTabla: tabla,
        idRegistro,
        accion,
        valoresAnteriores: anteriores ? (anteriores as object) : undefined,
        valoresNuevos: nuevos ? (nuevos as object) : undefined,
      },
    });
  }
}
