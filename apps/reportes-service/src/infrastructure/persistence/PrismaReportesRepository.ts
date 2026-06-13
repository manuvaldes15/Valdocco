import { getPrisma } from '@valdocco/prisma-client';

const prisma = getPrisma();

/**
 * Consultas de agregación para dashboards. Solo lectura.
 */
export class PrismaReportesRepository {
  async kpisDirector() {
    const anio = await prisma.anioLectivo.findFirst({ where: { activo: true, fechaElim: null } });
    const [alumnosActivos, docentes, fichasAbiertas, retirados, graduados] = await Promise.all([
      prisma.inscripcion.count({ where: { estado: 'ACTIVO', fechaElim: null, ...(anio ? { anioLectivoId: anio.id } : {}) } }),
      prisma.maestro.count({ where: { fechaElim: null } }),
      prisma.fichaAtencion.count({ where: { estado: 'ABIERTA', fechaElim: null } }),
      prisma.inscripcion.count({ where: { estado: 'RETIRADO', fechaElim: null, ...(anio ? { anioLectivoId: anio.id } : {}) } }),
      prisma.inscripcion.count({ where: { estado: 'GRADUADO', fechaElim: null, ...(anio ? { anioLectivoId: anio.id } : {}) } }),
    ]);

    // Promedio general y por grado a partir de notas calificadas
    const notas = await prisma.notaActividad.findMany({
      where: { estado: 'CALIFICADO', fechaElim: null, notaObtenida: { not: null } },
      select: {
        notaObtenida: true,
        actividad: {
          select: {
            porcentajePeso: true,
            notaMaxima: true,
            seccionMateria: { select: { seccion: { select: { notaMinimaAprobacion: true, grado: { select: { id: true, nombre: true, orden: true } } } } } },
          },
        },
        alumnoId: true,
      },
    });

    type Acum = { aportes: number; peso: number; orden: number };
    const porGrado = new Map<string, Acum>();
    const porAlumno = new Map<string, { aportes: number; peso: number; notaMinima: number }>();
    for (const n of notas) {
      const aporte = (Number(n.notaObtenida) / Number(n.actividad.notaMaxima)) * Number(n.actividad.porcentajePeso);
      const seccion = n.actividad.seccionMateria.seccion;
      const grado = seccion.grado;
      const g = porGrado.get(grado.nombre) ?? { aportes: 0, peso: 0, orden: grado.orden };
      g.aportes += aporte;
      g.peso += Number(n.actividad.porcentajePeso);
      porGrado.set(grado.nombre, g);

      const a = porAlumno.get(n.alumnoId) ?? { aportes: 0, peso: 0, notaMinima: Number(seccion.notaMinimaAprobacion) };
      a.aportes += aporte;
      a.peso += Number(n.actividad.porcentajePeso);
      porAlumno.set(n.alumnoId, a);
    }

    const promedioPorGrado = [...porGrado.entries()]
      .map(([nombre, g]) => ({
        grado: nombre,
        orden: g.orden,
        promedio: g.peso > 0 ? Math.round((g.aportes / g.peso) * 1000) / 100 : 0,
      }))
      .sort((x, y) => x.orden - y.orden);

    const promedios = [...porAlumno.values()].map((a) => ({
      promedio: a.peso > 0 ? (a.aportes / a.peso) * 10 : 0,
      notaMinima: a.notaMinima,
    }));
    const promedioGeneral =
      promedios.length > 0
        ? Math.round((promedios.reduce((s, p) => s + p.promedio, 0) / promedios.length) * 100) / 100
        : 0;
    const alumnosEnRiesgo = promedios.filter((p) => p.promedio < p.notaMinima).length;

    const [fichasRecientes, eventosProximos, cuadroHonor] = await Promise.all([
      prisma.fichaAtencion.findMany({
        where: { fechaElim: null },
        include: { alumno: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } } },
        orderBy: { fechaEmision: 'desc' },
        take: 5,
      }),
      prisma.eventoCalendario.findMany({
        where: { fechaElim: null, fechaFin: { gte: new Date() } },
        orderBy: { fechaInicio: 'asc' },
        take: 5,
      }),
      prisma.cuadroHonor.findMany({
        where: anio ? { anioLectivoId: anio.id } : {},
        include: { alumno: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } } },
        orderBy: { posicion: 'asc' },
        take: 5,
      }),
    ]);

    return {
      anioLectivo: anio?.nombre ?? null,
      kpis: {
        alumnosActivos,
        docentes,
        promedioGeneral,
        alumnosEnRiesgo,
        porcentajeRiesgo: promedios.length > 0 ? Math.round((alumnosEnRiesgo / promedios.length) * 100) : 0,
      },
      promedioPorGrado,
      distribucionEstados: [
        { estado: 'Activos', cantidad: alumnosActivos },
        { estado: 'Retirados', cantidad: retirados },
        { estado: 'Graduados', cantidad: graduados },
      ],
      fichasRecientes,
      eventosProximos,
      cuadroHonor,
      fichasAbiertas,
    };
  }

  /** Verifica si una persona (RESPONSABLE) está vinculada al alumno. */
  async esResponsableDe(personaId: string, alumnoId: string): Promise<boolean> {
    const vinculo = await prisma.alumnoResponsable.findFirst({
      where: { alumnoId, fechaElim: null, responsable: { personaId, fechaElim: null } },
      select: { id: true },
    });
    return Boolean(vinculo);
  }

  /** Datos completos para la libreta de calificaciones del alumno (año activo). */
  async datosLibreta(alumnoId: string) {
    const anio = await prisma.anioLectivo.findFirst({ where: { activo: true, fechaElim: null } });
    if (!anio) return null;

    const inscripcion = await prisma.inscripcion.findFirst({
      where: { alumnoId, anioLectivoId: anio.id, estado: 'ACTIVO', fechaElim: null },
      include: {
        alumno: { include: { persona: true } },
        seccion: { include: { grado: true } },
        maestroGuia: { include: { persona: { select: { primerNombre: true, primerApellido: true } } } },
      },
    });
    if (!inscripcion) return null;

    const [periodos, seccionMaterias, config] = await Promise.all([
      prisma.periodoEvaluacion.findMany({
        where: { gradoId: inscripcion.seccion.gradoId, anioLectivoId: anio.id, fechaElim: null },
        orderBy: { numeroPeriodo: 'asc' },
      }),
      prisma.seccionMateria.findMany({
        where: { seccionId: inscripcion.seccionId, anioLectivoId: anio.id, fechaElim: null },
        include: { materia: true },
        orderBy: { materia: { nombre: 'asc' } },
      }),
      prisma.configuracion.findFirst(),
    ]);

    // promedio por materia × periodo: SUM((nota/notaMax)*peso)/10 sobre lo calificado
    const materias = [];
    for (const sm of seccionMaterias) {
      const porPeriodo: (number | null)[] = [];
      for (const p of periodos) {
        const actividades = await prisma.actividad.findMany({
          where: { seccionMateriaId: sm.id, periodoEvaluacionId: p.id, fechaElim: null },
          select: {
            porcentajePeso: true,
            notaMaxima: true,
            notas: { where: { alumnoId, fechaElim: null, notaObtenida: { not: null } }, select: { notaObtenida: true } },
          },
        });
        let aportes = 0;
        let hayNotas = false;
        for (const a of actividades) {
          const nota = a.notas[0]?.notaObtenida;
          if (nota === undefined || nota === null) continue;
          hayNotas = true;
          aportes += (Number(nota) / Number(a.notaMaxima)) * Number(a.porcentajePeso);
        }
        porPeriodo.push(hayNotas ? Math.round((aportes / 10) * 100) / 100 : null);
      }
      const conNota = porPeriodo.filter((v): v is number => v !== null);
      materias.push({
        nombre: sm.materia.nombre,
        porPeriodo,
        promedio: conNota.length > 0 ? Math.round((conNota.reduce((s, v) => s + v, 0) / conNota.length) * 100) / 100 : null,
      });
    }

    return {
      institucion: config?.nombreInstitucion ?? 'Complejo Educativo Católico "María Auxiliadora"',
      direccion: config?.direccion ?? '',
      telefono: config?.telefono ?? '',
      anioLectivo: anio.nombre,
      alumno: {
        nombre: [
          inscripcion.alumno.persona.primerNombre,
          inscripcion.alumno.persona.segundoNombre,
          inscripcion.alumno.persona.primerApellido,
          inscripcion.alumno.persona.segundoApellido,
        ]
          .filter(Boolean)
          .join(' '),
        codigo: inscripcion.alumno.codigoAlumno ?? '—',
      },
      seccion: `${inscripcion.seccion.grado.nombre} "${inscripcion.seccion.nombre}" — Turno ${
        inscripcion.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'
      }`,
      maestroGuia: `${inscripcion.maestroGuia.persona.primerNombre} ${inscripcion.maestroGuia.persona.primerApellido}`,
      notaMinima: Number(inscripcion.seccion.notaMinimaAprobacion),
      periodos: periodos.map((p) => p.nombre),
      materias,
    };
  }

  async kpisMaestro(personaId: string) {
    const maestro = await prisma.maestro.findFirst({ where: { personaId, fechaElim: null } });
    if (!maestro) return null;

    const asignaciones = await prisma.seccionMateria.findMany({
      where: { maestroId: maestro.id, fechaElim: null, anioLectivo: { activo: true } },
      include: { seccion: { include: { grado: true } }, materia: true },
    });
    const seccionIds = [...new Set(asignaciones.map((a) => a.seccionId))];
    const alumnosACargo = await prisma.inscripcion.count({
      where: { seccionId: { in: seccionIds }, estado: 'ACTIVO', fechaElim: null },
    });
    const pendientes = await prisma.notaActividad.count({
      where: {
        estado: 'PENDIENTE',
        fechaElim: null,
        actividad: { seccionMateria: { maestroId: maestro.id }, fechaElim: null },
      },
    });
    const fichasEmitidas = await prisma.fichaAtencion.count({ where: { maestroId: maestro.id, fechaElim: null } });
    const actividadesProximas = await prisma.actividad.findMany({
      where: {
        fechaElim: null,
        seccionMateria: { maestroId: maestro.id },
        fechaEntrega: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
      },
      include: { seccionMateria: { include: { materia: true, seccion: { include: { grado: true } } } } },
      orderBy: { fechaEntrega: 'asc' },
    });

    return {
      maestroId: maestro.id,
      kpis: { alumnosACargo, secciones: seccionIds.length, actividadesPendientesCalificar: pendientes, fichasEmitidas },
      asignaciones,
      actividadesProximas,
    };
  }
}
