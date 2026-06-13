import { getPrisma } from '@valdocco/prisma-client';
import { IInscripcionRepository, InscripcionData } from '../../domain/repositories/IInscripcionRepository';

const prisma = getPrisma();

const includeCompleto = {
  alumno: { include: { persona: true } },
  seccion: { include: { grado: true } },
  anioLectivo: true,
  maestroGuia: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
} as const;

export class PrismaInscripcionRepository implements IInscripcionRepository {
  async maestroIdDePersona(personaId: string) {
    const m = await prisma.maestro.findFirst({ where: { personaId, fechaElim: null }, select: { id: true } });
    return m?.id ?? null;
  }

  findActiva(alumnoId: string, anioLectivoId: string) {
    return prisma.inscripcion.findFirst({
      where: { alumnoId, anioLectivoId, estado: 'ACTIVO', fechaElim: null },
      select: { id: true },
    });
  }

  contarActivasEnSeccion(seccionId: string, anioLectivoId: string) {
    return prisma.inscripcion.count({ where: { seccionId, anioLectivoId, estado: 'ACTIVO', fechaElim: null } });
  }

  async capacidadSeccion(seccionId: string) {
    const s = await prisma.seccion.findFirst({ where: { id: seccionId, fechaElim: null }, select: { capacidad: true } });
    return s?.capacidad ?? null;
  }

  crear(data: InscripcionData, userId: string) {
    return prisma.inscripcion.create({ data: { ...data, estado: 'ACTIVO', userCrea: userId }, include: includeCompleto });
  }

  async listar(filtro: { seccionId?: string; anioLectivoId?: string; estado?: string }, page: number, limit: number) {
    const where = { fechaElim: null, ...filtro };
    const [items, total] = await Promise.all([
      prisma.inscripcion.findMany({
        where,
        include: includeCompleto,
        orderBy: { fechaInscripcion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inscripcion.count({ where }),
    ]);
    return { items, total };
  }

  obtener(id: string) {
    return prisma.inscripcion.findFirst({ where: { id, fechaElim: null }, include: includeCompleto });
  }

  retirar(id: string, fechaRetiro: Date, motivo: string, userId: string) {
    return prisma.inscripcion.update({
      where: { id },
      data: { estado: 'RETIRADO', fechaRetiro, motivoRetiro: motivo, userMod: userId },
      include: includeCompleto,
    });
  }

  cambiarTurno(id: string, nuevaSeccionId: string, turno: string, fecha: Date, userId: string) {
    return prisma.inscripcion.update({
      where: { id },
      data: { seccionId: nuevaSeccionId, turnoTraslado: turno, fechaTraslado: fecha, userMod: userId },
      include: includeCompleto,
    });
  }

  async registrarAuditoria(usuarioId: string, idRegistro: string, accion: string, nuevos?: unknown) {
    await prisma.registroAuditoria.create({
      data: { usuarioId, nombreTabla: 'inscripciones', idRegistro, accion, valoresNuevos: nuevos ? (nuevos as object) : undefined },
    });
  }
}
