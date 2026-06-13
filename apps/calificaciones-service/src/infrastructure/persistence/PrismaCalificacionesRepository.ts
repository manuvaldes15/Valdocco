import { getPrisma } from '@valdocco/prisma-client';
import { ActividadData, ICalificacionesRepository } from '../../domain/repositories/ICalificacionesRepository';
import { resumenPeriodo } from '../../domain/services/CalculoNotas';

const prisma = getPrisma();

export class PrismaCalificacionesRepository implements ICalificacionesRepository {
  async maestroIdDePersona(personaId: string) {
    const m = await prisma.maestro.findFirst({ where: { personaId, fechaElim: null }, select: { id: true } });
    return m?.id ?? null;
  }

  async maestroDeSeccionMateria(seccionMateriaId: string) {
    const sm = await prisma.seccionMateria.findFirst({
      where: { id: seccionMateriaId, fechaElim: null },
      select: { maestroId: true },
    });
    return sm?.maestroId ?? null;
  }

  async maestroDeActividad(actividadId: string) {
    const a = await prisma.actividad.findFirst({
      where: { id: actividadId, fechaElim: null },
      select: { seccionMateria: { select: { maestroId: true } } },
    });
    return a?.seccionMateria.maestroId ?? null;
  }

  async sumaPesosPorPeriodo(seccionMateriaId: string, periodoEvaluacionId: string) {
    const agg = await prisma.actividad.aggregate({
      where: { seccionMateriaId, periodoEvaluacionId, fechaElim: null },
      _sum: { porcentajePeso: true },
    });
    return Number(agg._sum.porcentajePeso ?? 0);
  }

  async crearActividad(data: ActividadData, userId: string) {
    return prisma.actividad.create({ data: { ...data, userCrea: userId }, select: { id: true } });
  }

  async alumnosActivosDeSeccionMateria(seccionMateriaId: string) {
    const sm = await prisma.seccionMateria.findFirst({
      where: { id: seccionMateriaId, fechaElim: null },
      select: { seccionId: true, anioLectivoId: true },
    });
    if (!sm) return [];
    const inscripciones = await prisma.inscripcion.findMany({
      where: { seccionId: sm.seccionId, anioLectivoId: sm.anioLectivoId, estado: 'ACTIVO', fechaElim: null },
      select: { alumnoId: true },
    });
    return inscripciones.map((i) => i.alumnoId);
  }

  async crearNotasPendientes(actividadId: string, alumnoIds: string[], userId: string) {
    await prisma.notaActividad.createMany({
      data: alumnoIds.map((alumnoId) => ({ actividadId, alumnoId, estado: 'PENDIENTE', userCrea: userId })),
      skipDuplicates: true,
    });
  }

  listarActividades(filtro: { seccionMateriaId?: string; periodoEvaluacionId?: string }) {
    return prisma.actividad.findMany({
      where: { fechaElim: null, ...filtro },
      include: {
        periodoEvaluacion: { select: { nombre: true, numeroPeriodo: true } },
        seccionMateria: { include: { materia: true, seccion: { include: { grado: true } } } },
        _count: { select: { notas: { where: { estado: 'PENDIENTE', fechaElim: null } } } },
      },
      orderBy: { fechaEntrega: 'asc' },
    });
  }

  async obtenerActividad(id: string) {
    const a = await prisma.actividad.findFirst({ where: { id, fechaElim: null }, select: { id: true, notaMaxima: true } });
    return a ? { id: a.id, notaMaxima: Number(a.notaMaxima) } : null;
  }

  listarNotasDeActividad(actividadId: string) {
    return prisma.notaActividad.findMany({
      where: { actividadId, fechaElim: null },
      include: { alumno: { include: { persona: { select: { primerNombre: true, primerApellido: true, segundoApellido: true } } } } },
      orderBy: { alumno: { persona: { primerApellido: 'asc' } } },
    });
  }

  async calificarNota(actividadId: string, alumnoId: string, nota: number, comentario: string | null, userId: string) {
    return prisma.notaActividad.upsert({
      where: { actividadId_alumnoId: { actividadId, alumnoId } },
      create: { actividadId, alumnoId, notaObtenida: nota, comentario, estado: 'CALIFICADO', userCrea: userId },
      update: { notaObtenida: nota, comentario, estado: 'CALIFICADO', userMod: userId },
      select: { id: true },
    });
  }

  async actividadesCalificadasDeAlumno(alumnoId: string, seccionMateriaId: string, periodoEvaluacionId: string) {
    const actividades = await prisma.actividad.findMany({
      where: { seccionMateriaId, periodoEvaluacionId, fechaElim: null },
      select: {
        porcentajePeso: true,
        notaMaxima: true,
        notas: { where: { alumnoId, fechaElim: null }, select: { notaObtenida: true } },
      },
    });
    return actividades.map((a) => ({
      porcentajePeso: Number(a.porcentajePeso),
      notaMaxima: Number(a.notaMaxima),
      notaObtenida: a.notas[0]?.notaObtenida !== null && a.notas[0] !== undefined ? Number(a.notas[0].notaObtenida) : null,
    }));
  }

  async notaMinimaDeSeccionMateria(seccionMateriaId: string) {
    const sm = await prisma.seccionMateria.findFirst({
      where: { id: seccionMateriaId },
      select: { seccion: { select: { notaMinimaAprobacion: true } } },
    });
    return Number(sm?.seccion.notaMinimaAprobacion ?? 5);
  }

  listarPeriodos(gradoId: string, anioLectivoId?: string) {
    return prisma.periodoEvaluacion.findMany({
      where: { gradoId, fechaElim: null, ...(anioLectivoId ? { anioLectivoId } : { anioLectivo: { activo: true } }) },
      orderBy: { numeroPeriodo: 'asc' },
    });
  }

  /** Resumen del alumno: promedio y proyección por materia en el periodo vigente. */
  async resumenAlumno(alumnoId: string, anioLectivoId: string) {
    const inscripcion = await prisma.inscripcion.findFirst({
      where: { alumnoId, anioLectivoId, estado: 'ACTIVO', fechaElim: null },
      include: { seccion: { include: { grado: true } } },
    });
    if (!inscripcion) return { materias: [] };

    const hoy = new Date();
    const periodo =
      (await prisma.periodoEvaluacion.findFirst({
        where: {
          gradoId: inscripcion.seccion.gradoId,
          anioLectivoId,
          fechaElim: null,
          fechaInicio: { lte: hoy },
          fechaFin: { gte: hoy },
        },
      })) ??
      (await prisma.periodoEvaluacion.findFirst({
        where: { gradoId: inscripcion.seccion.gradoId, anioLectivoId, fechaElim: null },
        orderBy: { numeroPeriodo: 'asc' },
      }));
    if (!periodo) return { materias: [] };

    const seccionMaterias = await prisma.seccionMateria.findMany({
      where: { seccionId: inscripcion.seccionId, anioLectivoId, fechaElim: null },
      include: { materia: true },
    });

    const notaMinima = Number(inscripcion.seccion.notaMinimaAprobacion);
    const materias = [];
    for (const sm of seccionMaterias) {
      const actividades = await this.actividadesCalificadasDeAlumno(alumnoId, sm.id, periodo.id);
      const pendientes = actividades.filter((a) => a.notaObtenida === null).length;
      materias.push({
        seccionMateriaId: sm.id,
        materia: sm.materia.nombre,
        colorHex: sm.materia.colorHex,
        actividadesPendientes: pendientes,
        ...resumenPeriodo(actividades, notaMinima),
      });
    }
    return {
      periodo: { id: periodo.id, nombre: periodo.nombre },
      seccion: `${inscripcion.seccion.grado.nombre} ${inscripcion.seccion.nombre}`,
      notaMinima,
      materias,
    };
  }

  async registrarAuditoria(usuarioId: string, tabla: string, idRegistro: string, accion: string, nuevos?: unknown) {
    await prisma.registroAuditoria.create({
      data: { usuarioId, nombreTabla: tabla, idRegistro, accion, valoresNuevos: nuevos ? (nuevos as object) : undefined },
    });
  }
}
