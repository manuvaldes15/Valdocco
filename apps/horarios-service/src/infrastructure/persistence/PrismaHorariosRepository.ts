import { getPrisma } from '@valdocco/prisma-client';
import {
  ConflictoHorario,
  HorarioClaseData,
  IHorariosRepository,
} from '../../domain/repositories/IHorariosRepository';

const prisma = getPrisma();

/** Convierte 'HH:mm' al tipo TIME de Postgres (fecha ancla 1970-01-01 UTC). */
function aTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m));
}

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export class PrismaHorariosRepository implements IHorariosRepository {
  async maestroIdDePersona(personaId: string) {
    const m = await prisma.maestro.findFirst({ where: { personaId, fechaElim: null }, select: { id: true } });
    return m?.id ?? null;
  }

  async seccionMateria(seccionMateriaId: string) {
    const sm = await prisma.seccionMateria.findFirst({
      where: { id: seccionMateriaId, fechaElim: null },
      select: { maestroId: true, anioLectivoId: true },
    });
    return sm ?? null;
  }

  async maestroDeHorarioClase(id: string) {
    const h = await prisma.horarioClase.findFirst({ where: { id, fechaElim: null }, select: { maestroId: true } });
    return h?.maestroId ?? null;
  }

  async buscarConflictos(data: HorarioClaseData): Promise<ConflictoHorario[]> {
    const inicio = aTime(data.horaInicio);
    const fin = aTime(data.horaFin);
    const solapados = await prisma.horarioClase.findMany({
      where: {
        fechaElim: null,
        anioLectivoId: data.anioLectivoId,
        diaSemana: data.diaSemana,
        OR: [{ maestroId: data.maestroId }, { aulaId: data.aulaId }],
        // NOT (hora_fin <= inicio OR hora_inicio >= fin) → hay solapamiento
        NOT: [{ horaFin: { lte: inicio } }, { horaInicio: { gte: fin } }],
      },
      include: {
        maestro: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
        aula: { select: { nombre: true } },
      },
    });
    const conflictos: ConflictoHorario[] = [];
    for (const h of solapados) {
      if (h.maestroId === data.maestroId) {
        conflictos.push({
          tipo: 'MAESTRO',
          detalle: `${h.maestro.persona.primerNombre} ${h.maestro.persona.primerApellido} ya tiene clase el ${DIAS[h.diaSemana]} en ese horario`,
        });
      }
      if (h.aulaId === data.aulaId) {
        conflictos.push({ tipo: 'AULA', detalle: `El aula ${h.aula.nombre} está ocupada el ${DIAS[h.diaSemana]} en ese horario` });
      }
    }
    return conflictos;
  }

  crearHorarioClase(data: HorarioClaseData, userId: string) {
    return prisma.horarioClase.create({
      data: {
        maestroId: data.maestroId,
        seccionMateriaId: data.seccionMateriaId,
        aulaId: data.aulaId,
        anioLectivoId: data.anioLectivoId,
        diaSemana: data.diaSemana,
        horaInicio: aTime(data.horaInicio),
        horaFin: aTime(data.horaFin),
        userCrea: userId,
      },
      include: { aula: true, seccionMateria: { include: { materia: true, seccion: { include: { grado: true } } } } },
    });
  }

  listarHorarios(filtro: { maestroId?: string; aulaId?: string; anioLectivoId?: string; seccionId?: string }) {
    const { seccionId, ...resto } = filtro;
    return prisma.horarioClase.findMany({
      where: { fechaElim: null, ...resto, ...(seccionId ? { seccionMateria: { seccionId } } : {}) },
      include: {
        aula: true,
        maestro: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
        seccionMateria: { include: { materia: true, seccion: { include: { grado: true } } } },
      },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async eliminarHorarioClase(id: string, userId: string) {
    await prisma.horarioClase.update({ where: { id }, data: { fechaElim: new Date(), userElim: userId } });
  }

  listarAulas() {
    return prisma.aula.findMany({ where: { fechaElim: null }, orderBy: { nombre: 'asc' } });
  }

  crearAula(
    data: { nombre: string; capacidad?: number; edificio?: string; turnoManana?: boolean; turnoTarde?: boolean },
    userId: string
  ) {
    return prisma.aula.create({ data: { ...data, userCrea: userId } });
  }

  crearHorarioLaboral(
    data: { maestroId: string; anioLectivoId: string; diaSemana: number; horaEntrada: string; horaSalida: string; turno?: string },
    userId: string
  ) {
    return prisma.horarioLaboral.create({
      data: {
        maestroId: data.maestroId,
        anioLectivoId: data.anioLectivoId,
        diaSemana: data.diaSemana,
        horaEntrada: aTime(data.horaEntrada),
        horaSalida: aTime(data.horaSalida),
        turno: data.turno,
        userCrea: userId,
      },
    });
  }

  listarHorariosLaborales(maestroId: string, anioLectivoId?: string) {
    return prisma.horarioLaboral.findMany({
      where: { maestroId, fechaElim: null, ...(anioLectivoId ? { anioLectivoId } : {}) },
      orderBy: [{ diaSemana: 'asc' }, { horaEntrada: 'asc' }],
    });
  }
}
