import { NotaParaRanking } from '../repositories/ICalendarioRepository';

/**
 * Calcula el ranking de alumnos a partir de sus notas crudas.
 *
 * Promedio por materia = SUM((nota/notaMax) * peso) / 10  (escala 0–10)
 * Promedio general del alumno = media de sus materias con al menos una nota.
 * Resultado ordenado de mayor a menor promedio.
 */
export function calcularRanking(notas: NotaParaRanking[]): { alumnoId: string; promedio: number }[] {
  // alumno → materia → suma de aportes
  const porAlumno = new Map<string, Map<string, number>>();
  for (const n of notas) {
    if (n.notaObtenida === null || n.notaMaxima <= 0) continue;
    const aporte = (n.notaObtenida / n.notaMaxima) * n.porcentajePeso;
    const materias = porAlumno.get(n.alumnoId) ?? new Map<string, number>();
    materias.set(n.seccionMateriaId, (materias.get(n.seccionMateriaId) ?? 0) + aporte);
    porAlumno.set(n.alumnoId, materias);
  }

  return [...porAlumno.entries()]
    .map(([alumnoId, materias]) => {
      const promedios = [...materias.values()].map((aportes) => aportes / 10);
      const promedio = promedios.reduce((s, p) => s + p, 0) / promedios.length;
      return { alumnoId, promedio: Math.round(promedio * 100) / 100 };
    })
    .sort((a, b) => b.promedio - a.promedio);
}
