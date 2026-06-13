import { getPrisma } from '@valdocco/prisma-client';
import {
  AsignacionData,
  IAcademicoRepository,
  MateriaData,
  SeccionData,
} from '../../domain/repositories/IAcademicoRepository';

const prisma = getPrisma();

export class PrismaAcademicoRepository implements IAcademicoRepository {
  estructura() {
    return prisma.nivelAcademico.findMany({
      orderBy: { orden: 'asc' },
      include: {
        ciclos: {
          orderBy: { orden: 'asc' },
          include: {
            grados: {
              orderBy: { orden: 'asc' },
              include: { secciones: { where: { fechaElim: null }, orderBy: { nombre: 'asc' } } },
            },
          },
        },
      },
    });
  }

  anioActivo() {
    return prisma.anioLectivo.findFirst({ where: { activo: true, fechaElim: null } });
  }

  listarAniosLectivos() {
    return prisma.anioLectivo.findMany({ where: { fechaElim: null }, orderBy: { nombre: 'desc' } });
  }

  crearAnioLectivo(data: { nombre: string; fechaInicio: Date; fechaFin: Date; activo: boolean }, userId: string) {
    return prisma.$transaction(async (tx) => {
      if (data.activo) {
        await tx.anioLectivo.updateMany({ where: { activo: true }, data: { activo: false, userMod: userId } });
      }
      return tx.anioLectivo.create({ data: { ...data, userCrea: userId } });
    });
  }

  activarAnioLectivo(id: string, userId: string) {
    // Solo un año lectivo activo a la vez
    return prisma.$transaction(async (tx) => {
      await tx.anioLectivo.updateMany({ where: { activo: true }, data: { activo: false, userMod: userId } });
      return tx.anioLectivo.update({ where: { id }, data: { activo: true, userMod: userId } });
    });
  }

  listarSecciones(gradoId?: string) {
    return prisma.seccion.findMany({
      where: { fechaElim: null, ...(gradoId ? { gradoId } : {}) },
      include: { grado: { include: { ciclo: { include: { nivel: true } } } } },
      orderBy: [{ grado: { orden: 'asc' } }, { nombre: 'asc' }],
    });
  }

  crearSeccion(data: SeccionData, userId: string) {
    return prisma.seccion.create({ data: { ...data, userCrea: userId }, include: { grado: true } });
  }

  async existeSeccion(gradoId: string, nombre: string, turno: string) {
    const s = await prisma.seccion.findFirst({ where: { gradoId, nombre, turno, fechaElim: null }, select: { id: true } });
    return Boolean(s);
  }

  listarMaterias() {
    return prisma.materia.findMany({ where: { fechaElim: null }, orderBy: { nombre: 'asc' } });
  }

  crearMateria(data: MateriaData, userId: string) {
    return prisma.materia.create({ data: { ...data, userCrea: userId } });
  }

  listarAsignaciones(filtro: { seccionId?: string; maestroId?: string; anioLectivoId?: string }) {
    return prisma.seccionMateria.findMany({
      where: { fechaElim: null, ...filtro },
      include: {
        seccion: { include: { grado: true } },
        materia: true,
        maestro: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
      },
    });
  }

  crearAsignacion(data: AsignacionData, userId: string) {
    return prisma.seccionMateria.create({
      data: { ...data, userCrea: userId },
      include: { seccion: true, materia: true },
    });
  }

  async existeAsignacion(seccionId: string, materiaId: string, anioLectivoId: string) {
    const a = await prisma.seccionMateria.findFirst({
      where: { seccionId, materiaId, anioLectivoId, fechaElim: null },
      select: { id: true },
    });
    return Boolean(a);
  }
}
