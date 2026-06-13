import { getPrisma } from '@valdocco/prisma-client';
import {
  AnuncioData,
  EventoData,
  FichaData,
  ICalendarioRepository,
  NotaParaRanking,
  RecurrenteData,
  SeccionGuia,
} from '../../domain/repositories/ICalendarioRepository';

const prisma = getPrisma();

function aTime(hhmm: string | null | undefined): Date | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m));
}

export class PrismaCalendarioRepository implements ICalendarioRepository {
  listarEventos(desde?: Date, hasta?: Date) {
    return prisma.eventoCalendario.findMany({
      where: {
        fechaElim: null,
        ...(desde ? { fechaFin: { gte: desde } } : {}),
        ...(hasta ? { fechaInicio: { lte: hasta } } : {}),
      },
      include: { gradoDestino: { select: { nombre: true } } },
      orderBy: { fechaInicio: 'asc' },
    });
  }

  crearEvento(data: EventoData, usuarioId: string) {
    return prisma.eventoCalendario.create({ data: { ...data, creadoPorId: usuarioId, userCrea: usuarioId } });
  }

  listarAnuncios(soloVigentes: boolean) {
    const ahora = new Date();
    return prisma.anuncio.findMany({
      where: {
        fechaElim: null,
        ...(soloVigentes
          ? { publicadoEn: { lte: ahora }, OR: [{ expiraEn: null }, { expiraEn: { gte: ahora } }] }
          : {}),
      },
      include: { autor: { select: { nombreUsuario: true } } },
      orderBy: [{ esDestacado: 'desc' }, { publicadoEn: 'desc' }],
    });
  }

  crearAnuncio(data: AnuncioData, usuarioId: string) {
    return prisma.anuncio.create({
      data: { ...data, autorId: usuarioId, publicadoEn: new Date(), userCrea: usuarioId },
    });
  }

  crearFicha(data: FichaData, userId: string) {
    return prisma.fichaAtencion.create({
      data: { ...data, estado: 'ABIERTA', notificadoEn: new Date(), userCrea: userId },
      select: { id: true },
    });
  }

  listarFichas(filtro: { alumnoId?: string; maestroId?: string; estado?: string }) {
    return prisma.fichaAtencion.findMany({
      where: { fechaElim: null, ...filtro },
      include: {
        alumno: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
        maestro: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
      },
      orderBy: { fechaEmision: 'desc' },
    });
  }

  acusarFicha(id: string, userId: string) {
    return prisma.fichaAtencion.update({
      where: { id },
      data: { estado: 'ACUSADA', acuseResponsableEn: new Date(), userMod: userId },
    });
  }

  resolverFicha(id: string, userId: string) {
    return prisma.fichaAtencion.update({ where: { id }, data: { estado: 'RESUELTA', userMod: userId } });
  }

  async responsablesPrincipalesDeAlumno(alumnoId: string) {
    const vinculos = await prisma.alumnoResponsable.findMany({
      where: { alumnoId, esPrincipal: true, fechaElim: null },
      include: { responsable: { select: { personaId: true } } },
    });
    return vinculos.map((v) => v.responsable.personaId);
  }

  async maestroDePersona(personaId: string) {
    const m = await prisma.maestro.findFirst({ where: { personaId, fechaElim: null }, select: { id: true } });
    return m?.id ?? null;
  }

  cuadroHonorActual() {
    return prisma.cuadroHonor.findMany({
      where: { anioLectivo: { activo: true } },
      include: {
        alumno: {
          include: {
            persona: { select: { primerNombre: true, primerApellido: true } },
            inscripciones: {
              where: { estado: 'ACTIVO', fechaElim: null },
              include: { seccion: { include: { grado: true } } },
            },
          },
        },
        periodoEvaluacion: { select: { nombre: true } },
      },
      orderBy: { posicion: 'asc' },
      take: 20,
    });
  }

  async registrarAuditoria(usuarioId: string, tabla: string, idRegistro: string, accion: string, nuevos?: unknown) {
    await prisma.registroAuditoria.create({
      data: { usuarioId, nombreTabla: tabla, idRegistro, accion, valoresNuevos: nuevos ? (nuevos as object) : undefined },
    });
  }

  // ── Catálogo de actividades recurrentes ──

  listarRecurrentes() {
    return prisma.actividadRecurrente.findMany({
      where: { fechaElim: null },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  crearRecurrente(data: RecurrenteData, userId: string) {
    return prisma.actividadRecurrente.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        diaSemana: data.diaSemana,
        horaInicio: aTime(data.horaInicio),
        horaFin: aTime(data.horaFin),
        colorHex: data.colorHex,
        publicoDestino: data.publicoDestino,
        userCrea: userId,
      },
    });
  }

  async eliminarRecurrente(id: string, userId: string) {
    await prisma.actividadRecurrente.update({
      where: { id },
      data: { fechaElim: new Date(), userElim: userId },
    });
  }

  // ── Generación del cuadro de honor ──

  async anioActivoId() {
    const anio = await prisma.anioLectivo.findFirst({ where: { activo: true, fechaElim: null }, select: { id: true } });
    return anio?.id ?? null;
  }

  async periodoVigenteDeGrado(gradoId: string, anioLectivoId: string) {
    const hoy = new Date();
    const periodo =
      (await prisma.periodoEvaluacion.findFirst({
        where: { gradoId, anioLectivoId, fechaElim: null, fechaInicio: { lte: hoy }, fechaFin: { gte: hoy } },
        select: { id: true },
      })) ??
      // fuera de fechas de periodo: usar el último periodo iniciado
      (await prisma.periodoEvaluacion.findFirst({
        where: { gradoId, anioLectivoId, fechaElim: null, fechaInicio: { lte: hoy } },
        orderBy: { numeroPeriodo: 'desc' },
        select: { id: true },
      }));
    return periodo?.id ?? null;
  }

  async gradosConPeriodoVigente(anioLectivoId: string) {
    const grados = await prisma.grado.findMany({
      where: { secciones: { some: { fechaElim: null } } },
      select: { id: true },
    });
    const resultado: { gradoId: string; periodoId: string }[] = [];
    for (const g of grados) {
      const periodoId = await this.periodoVigenteDeGrado(g.id, anioLectivoId);
      if (periodoId) resultado.push({ gradoId: g.id, periodoId });
    }
    return resultado;
  }

  async notasDeGradoEnPeriodo(gradoId: string, periodoId: string, anioLectivoId: string): Promise<NotaParaRanking[]> {
    const notas = await prisma.notaActividad.findMany({
      where: {
        fechaElim: null,
        estado: 'CALIFICADO',
        notaObtenida: { not: null },
        actividad: {
          fechaElim: null,
          periodoEvaluacionId: periodoId,
          seccionMateria: { anioLectivoId, seccion: { gradoId } },
        },
        // Solo alumnos con inscripción activa en el grado
        alumno: {
          inscripciones: { some: { estado: 'ACTIVO', anioLectivoId, fechaElim: null, seccion: { gradoId } } },
        },
      },
      select: {
        alumnoId: true,
        notaObtenida: true,
        actividad: { select: { seccionMateriaId: true, porcentajePeso: true, notaMaxima: true } },
      },
    });
    return notas.map((n) => ({
      alumnoId: n.alumnoId,
      seccionMateriaId: n.actividad.seccionMateriaId,
      porcentajePeso: Number(n.actividad.porcentajePeso),
      notaMaxima: Number(n.actividad.notaMaxima),
      notaObtenida: n.notaObtenida === null ? null : Number(n.notaObtenida),
    }));
  }

  async reemplazarCuadroHonor(
    anioLectivoId: string,
    periodoId: string,
    entradas: { alumnoId: string; posicion: number; promedioGeneral: number }[],
    userId: string
  ) {
    // Tabla derivada y regenerable: se reemplaza el periodo completo
    await prisma.$transaction([
      prisma.cuadroHonor.deleteMany({ where: { anioLectivoId, periodoEvaluacionId: periodoId } }),
      prisma.cuadroHonor.createMany({
        data: entradas.map((e) => ({
          anioLectivoId,
          periodoEvaluacionId: periodoId,
          alumnoId: e.alumnoId,
          posicion: e.posicion,
          promedioGeneral: e.promedioGeneral,
          userCrea: userId,
        })),
      }),
    ]);
  }

  // ── Cuadro de honor por sección (docente guía) ──

  async seccionesDondeEsGuia(maestroId: string, anioLectivoId: string): Promise<SeccionGuia[]> {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { maestroGuiaId: maestroId, anioLectivoId, estado: 'ACTIVO', fechaElim: null },
      select: { seccion: { select: { id: true, nombre: true, gradoId: true, grado: { select: { nombre: true } } } } },
      distinct: ['seccionId'],
    });
    return inscripciones.map((i) => ({
      seccionId: i.seccion.id,
      gradoId: i.seccion.gradoId,
      nombre: `${i.seccion.grado.nombre} · ${i.seccion.nombre}`,
    }));
  }

  async gradoDeSeccion(seccionId: string) {
    const s = await prisma.seccion.findFirst({
      where: { id: seccionId, fechaElim: null },
      select: { gradoId: true, nombre: true, grado: { select: { nombre: true } } },
    });
    return s ? { gradoId: s.gradoId, nombre: `${s.grado.nombre} · ${s.nombre}` } : null;
  }

  async notasDeSeccionEnPeriodo(seccionId: string, periodoId: string, anioLectivoId: string): Promise<NotaParaRanking[]> {
    const notas = await prisma.notaActividad.findMany({
      where: {
        fechaElim: null,
        estado: 'CALIFICADO',
        notaObtenida: { not: null },
        actividad: {
          fechaElim: null,
          periodoEvaluacionId: periodoId,
          seccionMateria: { anioLectivoId, seccionId },
        },
        alumno: {
          inscripciones: { some: { estado: 'ACTIVO', anioLectivoId, fechaElim: null, seccionId } },
        },
      },
      select: {
        alumnoId: true,
        notaObtenida: true,
        actividad: { select: { seccionMateriaId: true, porcentajePeso: true, notaMaxima: true } },
      },
    });
    return notas.map((n) => ({
      alumnoId: n.alumnoId,
      seccionMateriaId: n.actividad.seccionMateriaId,
      porcentajePeso: Number(n.actividad.porcentajePeso),
      notaMaxima: Number(n.actividad.notaMaxima),
      notaObtenida: n.notaObtenida === null ? null : Number(n.notaObtenida),
    }));
  }

  async alumnosDeSeccion(seccionId: string, anioLectivoId: string) {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { seccionId, anioLectivoId, estado: 'ACTIVO', fechaElim: null },
      select: { alumnoId: true },
    });
    return inscripciones.map((i) => i.alumnoId);
  }

  async nombresDeAlumnos(alumnoIds: string[]) {
    if (alumnoIds.length === 0) return new Map<string, string>();
    const alumnos = await prisma.alumno.findMany({
      where: { id: { in: alumnoIds } },
      select: { id: true, persona: { select: { primerNombre: true, primerApellido: true, segundoApellido: true } } },
    });
    return new Map(
      alumnos.map((a) => [
        a.id,
        `${a.persona.primerNombre} ${a.persona.primerApellido} ${a.persona.segundoApellido ?? ''}`.trim(),
      ])
    );
  }

  async reemplazarCuadroHonorDeAlumnos(
    anioLectivoId: string,
    periodoId: string,
    alumnoIdsDelGrupo: string[],
    entradas: { alumnoId: string; posicion: number; promedioGeneral: number }[],
    userId: string
  ) {
    // Reemplaza solo la porción de la sección: no toca entradas de otras secciones del mismo periodo.
    await prisma.$transaction([
      prisma.cuadroHonor.deleteMany({
        where: { anioLectivoId, periodoEvaluacionId: periodoId, alumnoId: { in: alumnoIdsDelGrupo } },
      }),
      prisma.cuadroHonor.createMany({
        data: entradas.map((e) => ({
          anioLectivoId,
          periodoEvaluacionId: periodoId,
          alumnoId: e.alumnoId,
          posicion: e.posicion,
          promedioGeneral: e.promedioGeneral,
          userCrea: userId,
        })),
      }),
    ]);
  }
}
