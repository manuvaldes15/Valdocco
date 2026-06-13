/**
 * Seed inicial de Valdocco — CECMA Chalchuapa.
 * Crea estructura académica, usuarios demo y datos de ejemplo para dashboards.
 * Idempotente: si ya existe configuración, no vuelve a sembrar.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASS = {
  admin: 'Admin.Valdocco.2026',
  director: 'Directora.CECMA.2026',
  maestro: 'Maestro.CECMA.2026',
  responsable: 'Padre.CECMA.2026',
};

async function main() {
  const existente = await prisma.configuracion.findFirst();
  if (existente) {
    console.log('Seed ya aplicado, no se repite.');
    return;
  }

  // ── Configuración institucional ──
  await prisma.configuracion.create({
    data: {
      nombreInstitucion: 'Complejo Educativo Católico "María Auxiliadora"',
      direccion:
        'Final 10a. Avenida Sur y Calle hacia el Cantón El Arado, Barrio San Sebastián, Chalchuapa, Santa Ana, El Salvador',
      telefono: '2444-0215',
      email: 'hdsamelia24@hotmail.com',
      turnoManana: true,
      turnoTarde: true,
    },
  });

  // ── Niveles, ciclos y grados ──
  const niveles = await Promise.all(
    [
      { nombre: 'Parvularia', orden: 1 },
      { nombre: 'Primaria', orden: 2 },
      { nombre: 'Secundaria', orden: 3 },
      { nombre: 'Bachillerato', orden: 4 },
    ].map((n) => prisma.nivelAcademico.create({ data: n }))
  );
  const [parvularia, primaria, secundaria, bachillerato] = niveles;

  const cicloParv = await prisma.ciclo.create({ data: { nivelId: parvularia.id, nombre: 'Parvularia', orden: 1 } });
  const ciclo1 = await prisma.ciclo.create({ data: { nivelId: primaria.id, nombre: 'Primer Ciclo', orden: 2 } });
  const ciclo2 = await prisma.ciclo.create({ data: { nivelId: primaria.id, nombre: 'Segundo Ciclo', orden: 3 } });
  const ciclo3 = await prisma.ciclo.create({ data: { nivelId: secundaria.id, nombre: 'Tercer Ciclo', orden: 4 } });
  const cicloBach = await prisma.ciclo.create({ data: { nivelId: bachillerato.id, nombre: 'Bachillerato', orden: 5 } });

  const gradosDef: { ciclo: string; nombre: string; orden: number; sistema: string }[] = [
    { ciclo: cicloParv.id, nombre: 'Parvularia 4', orden: 1, sistema: 'TRIMESTRAL' },
    { ciclo: cicloParv.id, nombre: 'Parvularia 5', orden: 2, sistema: 'TRIMESTRAL' },
    { ciclo: cicloParv.id, nombre: 'Parvularia 6', orden: 3, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo1.id, nombre: '1er Grado', orden: 4, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo1.id, nombre: '2do Grado', orden: 5, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo1.id, nombre: '3er Grado', orden: 6, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo2.id, nombre: '4to Grado', orden: 7, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo2.id, nombre: '5to Grado', orden: 8, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo2.id, nombre: '6to Grado', orden: 9, sistema: 'TRIMESTRAL' },
    { ciclo: ciclo3.id, nombre: '7mo Grado', orden: 10, sistema: 'PERIODOS' },
    { ciclo: ciclo3.id, nombre: '8vo Grado', orden: 11, sistema: 'PERIODOS' },
    { ciclo: ciclo3.id, nombre: '9no Grado', orden: 12, sistema: 'PERIODOS' },
    { ciclo: cicloBach.id, nombre: '1er Año de Bachillerato', orden: 13, sistema: 'PERIODOS' },
    { ciclo: cicloBach.id, nombre: '2do Año de Bachillerato', orden: 14, sistema: 'PERIODOS' },
  ];
  const grados = [];
  for (const g of gradosDef) {
    grados.push(
      await prisma.grado.create({
        data: { cicloId: g.ciclo, nombre: g.nombre, orden: g.orden, sistemaEvaluacion: g.sistema },
      })
    );
  }

  // ── Año lectivo 2026 (activo) ──
  const anio = await prisma.anioLectivo.create({
    data: {
      nombre: '2026',
      fechaInicio: new Date('2026-01-19'),
      fechaFin: new Date('2026-11-06'),
      activo: true,
    },
  });

  // ── Periodos de evaluación por grado ──
  const trimestres = [
    { n: 1, nombre: '1er Trimestre', ini: '2026-01-19', fin: '2026-04-24' },
    { n: 2, nombre: '2do Trimestre', ini: '2026-04-27', fin: '2026-07-31' },
    { n: 3, nombre: '3er Trimestre', ini: '2026-08-03', fin: '2026-11-06' },
  ];
  const periodos4 = [
    { n: 1, nombre: '1er Periodo', ini: '2026-01-19', fin: '2026-03-27' },
    { n: 2, nombre: '2do Periodo', ini: '2026-03-30', fin: '2026-06-05' },
    { n: 3, nombre: '3er Periodo', ini: '2026-06-08', fin: '2026-08-21' },
    { n: 4, nombre: '4to Periodo', ini: '2026-08-24', fin: '2026-11-06' },
  ];
  const periodosPorGrado = new Map<string, { id: string; numeroPeriodo: number }[]>();
  for (const grado of grados) {
    const defs = grado.sistemaEvaluacion === 'TRIMESTRAL' ? trimestres : periodos4;
    const creados = [];
    for (const p of defs) {
      const per = await prisma.periodoEvaluacion.create({
        data: {
          anioLectivoId: anio.id,
          gradoId: grado.id,
          nombre: p.nombre,
          numeroPeriodo: p.n,
          fechaInicio: new Date(p.ini),
          fechaFin: new Date(p.fin),
        },
      });
      creados.push({ id: per.id, numeroPeriodo: per.numeroPeriodo });
    }
    periodosPorGrado.set(grado.id, creados);
  }

  // ── Materias ──
  const materiasDef = [
    { nombre: 'Matemática', codigo: 'MAT', colorHex: '#4f8ef7' },
    { nombre: 'Lenguaje y Literatura', codigo: 'LEN', colorHex: '#34d399' },
    { nombre: 'Ciencias Naturales', codigo: 'CN', colorHex: '#fbbf24' },
    { nombre: 'Estudios Sociales', codigo: 'SS', colorHex: '#f87171' },
    { nombre: 'Inglés', codigo: 'ING', colorHex: '#a78bfa' },
    { nombre: 'Educación en la Fe', codigo: 'FE', colorHex: '#60a5fa' },
    { nombre: 'Educación Física', codigo: 'EF', colorHex: '#fb923c' },
    { nombre: 'Informática', codigo: 'INF', colorHex: '#2dd4bf' },
  ];
  const materias = [];
  for (const m of materiasDef) materias.push(await prisma.materia.create({ data: m }));

  // ── Helper para crear persona + usuario ──
  const hash = (p: string) => bcrypt.hashSync(p, 12);
  async function crearUsuario(
    rol: string,
    nombreUsuario: string,
    email: string,
    password: string,
    persona: { primerNombre: string; segundoNombre?: string; primerApellido: string; segundoApellido?: string; genero?: string }
  ) {
    const per = await prisma.persona.create({ data: { ...persona, email } });
    const usr = await prisma.usuario.create({
      data: { personaId: per.id, nombreUsuario, email, contrasenaHash: hash(password), rol },
    });
    return { persona: per, usuario: usr };
  }

  // ── Usuarios base ──
  const admin = await crearUsuario('ADMIN', 'admin', 'admin@valdocco.local', PASS.admin, {
    primerNombre: 'Manuel',
    primerApellido: 'Valdés',
    genero: 'M',
  });
  await crearUsuario('DIRECTOR', 'directora', 'direccion@cecma.edu.sv', PASS.director, {
    primerNombre: 'Jesús',
    segundoNombre: 'Amelia',
    primerApellido: 'Alvarado',
    genero: 'F',
  });

  // ── Maestros ──
  const maestrosDef = [
    { pn: 'Carlos', pa: 'Hernández', esp: 'Matemática', genero: 'M' },
    { pn: 'María', pa: 'López', esp: 'Lenguaje y Literatura', genero: 'F' },
    { pn: 'Ana', pa: 'Martínez', esp: 'Ciencias Naturales', genero: 'F' },
    { pn: 'José', pa: 'Ramírez', esp: 'Estudios Sociales', genero: 'M' },
  ];
  const maestros = [];
  for (let i = 0; i < maestrosDef.length; i++) {
    const m = maestrosDef[i];
    const { persona } = await crearUsuario(
      'MAESTRO',
      `maestro${i + 1}`,
      `maestro${i + 1}@cecma.edu.sv`,
      PASS.maestro,
      { primerNombre: m.pn, primerApellido: m.pa, genero: m.genero }
    );
    maestros.push(
      await prisma.maestro.create({
        data: {
          personaId: persona.id,
          codigoMaestro: `M-${String(i + 1).padStart(3, '0')}`,
          especializacion: m.esp,
          fechaContratacion: new Date('2020-01-15'),
          tipoContrato: 'TIEMPO_COMPLETO',
        },
      })
    );
  }

  // ── Secciones para 2do Grado y 9no Grado (demo) ──
  const grado2 = grados.find((g) => g.nombre === '2do Grado')!;
  const grado9 = grados.find((g) => g.nombre === '9no Grado')!;
  const seccion2C = await prisma.seccion.create({
    data: { gradoId: grado2.id, nombre: 'C', turno: 'MANANA', notaMinimaAprobacion: 5.0, capacidad: 35 },
  });
  const seccion9A = await prisma.seccion.create({
    data: { gradoId: grado9.id, nombre: 'A', turno: 'MANANA', notaMinimaAprobacion: 5.0, capacidad: 35 },
  });

  // ── Asignación materia-maestro por sección ──
  const seccionMaterias: { id: string; seccionId: string }[] = [];
  for (const seccion of [seccion2C, seccion9A]) {
    for (let i = 0; i < 4; i++) {
      const sm = await prisma.seccionMateria.create({
        data: {
          seccionId: seccion.id,
          materiaId: materias[i].id,
          maestroId: maestros[i].id,
          anioLectivoId: anio.id,
          horasSemanales: 5,
        },
      });
      seccionMaterias.push({ id: sm.id, seccionId: seccion.id });
    }
  }

  // ── Aulas ──
  const aula1 = await prisma.aula.create({ data: { nombre: 'Aula 101', capacidad: 35, edificio: 'Edificio Don Bosco' } });
  await prisma.aula.create({ data: { nombre: 'Aula 102', capacidad: 35, edificio: 'Edificio Don Bosco' } });
  await prisma.aula.create({ data: { nombre: 'Laboratorio de Cómputo', capacidad: 30, edificio: 'Edificio María Auxiliadora' } });

  // ── Horario de clases demo (sin conflictos) ──
  const t = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));
  await prisma.horarioClase.create({
    data: {
      maestroId: maestros[0].id,
      seccionMateriaId: seccionMaterias[0].id,
      aulaId: aula1.id,
      anioLectivoId: anio.id,
      diaSemana: 1,
      horaInicio: t(7),
      horaFin: t(8, 30),
    },
  });

  // ── Responsable demo ──
  const { persona: personaResp } = await crearUsuario('RESPONSABLE', 'padre1', 'padre1@correo.com', PASS.responsable, {
    primerNombre: 'Julio',
    primerApellido: 'Mendoza',
    genero: 'M',
  });
  const responsable = await prisma.responsable.create({
    data: { personaId: personaResp.id, tipoRelacion: 'PADRE' },
  });

  // ── Alumnos demo ──
  const alumnosDef = [
    { pn: 'Julio', pa: 'Mendoza', sa: 'García', genero: 'M', seccion: seccion2C },
    { pn: 'Sofía', pa: 'Pérez', sa: 'Linares', genero: 'F', seccion: seccion2C },
    { pn: 'Diego', pa: 'Castro', sa: 'Rivas', genero: 'M', seccion: seccion2C },
    { pn: 'Valeria', pa: 'Aguilar', sa: 'Morán', genero: 'F', seccion: seccion2C },
    { pn: 'Fernanda', pa: 'Sandoval', sa: 'Cruz', genero: 'F', seccion: seccion9A },
    { pn: 'Andrés', pa: 'Figueroa', sa: 'Polanco', genero: 'M', seccion: seccion9A },
    { pn: 'Camila', pa: 'Zepeda', sa: 'Ortiz', genero: 'F', seccion: seccion9A },
    { pn: 'Mateo', pa: 'Guzmán', sa: 'Alas', genero: 'M', seccion: seccion9A },
  ];
  const alumnos: { id: string; seccionId: string }[] = [];
  for (let i = 0; i < alumnosDef.length; i++) {
    const a = alumnosDef[i];
    const per = await prisma.persona.create({
      data: {
        primerNombre: a.pn,
        primerApellido: a.pa,
        segundoApellido: a.sa,
        genero: a.genero,
        fechaNacimiento: new Date(a.seccion === seccion2C ? '2018-05-10' : '2011-03-22'),
        nacionalidad: 'Salvadoreña',
      },
    });
    const al = await prisma.alumno.create({
      data: { personaId: per.id, codigoAlumno: `A26-${String(i + 1).padStart(4, '0')}` },
    });
    alumnos.push({ id: al.id, seccionId: a.seccion.id });
    await prisma.inscripcion.create({
      data: {
        alumnoId: al.id,
        seccionId: a.seccion.id,
        anioLectivoId: anio.id,
        maestroGuiaId: maestros[i % 4].id,
        fechaInscripcion: new Date('2026-01-12'),
        estado: 'ACTIVO',
      },
    });
  }
  // Julio es hijo del responsable demo
  await prisma.alumnoResponsable.create({
    data: { alumnoId: alumnos[0].id, responsableId: responsable.id, esPrincipal: true },
  });

  // ── Actividades y notas (2do Grado C — Matemática — 1er Trimestre) ──
  const periodo1Grado2 = periodosPorGrado.get(grado2.id)![0];
  const smMate2C = seccionMaterias[0];
  const actividadesDef = [
    { titulo: 'Examen de sumas y restas', tipo: 'EXAMEN', peso: 20, notaMax: 10 },
    { titulo: 'Tarea: tablas de multiplicar', tipo: 'TAREA', peso: 15, notaMax: 10 },
    { titulo: 'Proyecto: la tiendita', tipo: 'PROYECTO', peso: 30, notaMax: 10 },
  ];
  const notasPorAlumno = [
    [8, 7, 9],
    [9, 9.5, 10],
    [4, 5, 6],
    [7, 8, 7.5],
  ];
  const alumnos2C = alumnos.filter((a) => a.seccionId === seccion2C.id);
  for (let j = 0; j < actividadesDef.length; j++) {
    const def = actividadesDef[j];
    const act = await prisma.actividad.create({
      data: {
        seccionMateriaId: smMate2C.id,
        periodoEvaluacionId: periodo1Grado2.id,
        titulo: def.titulo,
        tipo: def.tipo,
        porcentajePeso: def.peso,
        notaMaxima: def.notaMax,
        fechaEntrega: new Date('2026-03-15'),
      },
    });
    for (let k = 0; k < alumnos2C.length; k++) {
      await prisma.notaActividad.create({
        data: {
          actividadId: act.id,
          alumnoId: alumnos2C[k].id,
          notaObtenida: notasPorAlumno[k][j],
          estado: 'CALIFICADO',
        },
      });
    }
  }

  // ── Fichas de atención demo ──
  await prisma.fichaAtencion.create({
    data: {
      alumnoId: alumnos2C[2].id,
      maestroId: maestros[0].id,
      titulo: 'Bajo rendimiento en Matemática',
      descripcion: 'El alumno presenta dificultades con las operaciones básicas. Se recomienda refuerzo en casa.',
      gravedad: 'MEDIA',
      fechaEmision: new Date('2026-05-20'),
      estado: 'ABIERTA',
    },
  });
  await prisma.fichaAtencion.create({
    data: {
      alumnoId: alumnos[5].id,
      maestroId: maestros[3].id,
      titulo: 'Inasistencias recurrentes',
      descripcion: 'Tres inasistencias sin justificar en las últimas dos semanas.',
      gravedad: 'ALTA',
      fechaEmision: new Date('2026-06-01'),
      estado: 'ABIERTA',
    },
  });

  // ── Eventos y anuncios ──
  await prisma.eventoCalendario.create({
    data: {
      titulo: 'Fiesta de María Auxiliadora',
      descripcion: 'Celebración institucional con eucaristía, oratorio festivo y actividades culturales.',
      fechaInicio: new Date('2026-05-24'),
      fechaFin: new Date('2026-05-24'),
      tipoEvento: 'INSTITUCIONAL',
      publicoDestino: 'TODOS',
      creadoPorId: admin.usuario.id,
    },
  });
  await prisma.eventoCalendario.create({
    data: {
      titulo: 'Exámenes del 2do Periodo',
      descripcion: 'Semana de evaluaciones para Tercer Ciclo y Bachillerato.',
      fechaInicio: new Date('2026-06-15'),
      fechaFin: new Date('2026-06-19'),
      tipoEvento: 'EVALUACION',
      publicoDestino: 'ALUMNOS',
      creadoPorId: admin.usuario.id,
    },
  });
  await prisma.anuncio.create({
    data: {
      titulo: 'Inicio del Oratorio Festivo',
      contenido:
        'Invitamos a toda la comunidad educativa al Oratorio Festivo todos los sábados a partir de las 2:00 PM.',
      autorId: admin.usuario.id,
      publicoDestino: 'TODOS',
      esDestacado: true,
      publicadoEn: new Date(),
    },
  });

  // ── Cuadro de honor del 1er Trimestre (2do Grado) ──
  const honor = [
    { alumno: alumnos2C[1], posicion: 1, promedio: 9.5 },
    { alumno: alumnos2C[0], posicion: 2, promedio: 8.0 },
    { alumno: alumnos2C[3], posicion: 3, promedio: 7.5 },
  ];
  for (const h of honor) {
    await prisma.cuadroHonor.create({
      data: {
        anioLectivoId: anio.id,
        periodoEvaluacionId: periodo1Grado2.id,
        alumnoId: h.alumno.id,
        posicion: h.posicion,
        promedioGeneral: h.promedio,
      },
    });
  }

  console.log('Seed completado.');
  console.log('Credenciales demo:');
  console.log(`  ADMIN:        admin@valdocco.local / ${PASS.admin}`);
  console.log(`  DIRECTOR:     direccion@cecma.edu.sv / ${PASS.director}`);
  console.log(`  MAESTRO:      maestro1@cecma.edu.sv / ${PASS.maestro}`);
  console.log(`  RESPONSABLE:  padre1@correo.com / ${PASS.responsable}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
