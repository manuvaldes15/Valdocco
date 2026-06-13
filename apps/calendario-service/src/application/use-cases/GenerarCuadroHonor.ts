import { DomainError } from '@valdocco/shared-types';
import { ICalendarioRepository } from '../../domain/repositories/ICalendarioRepository';
import { calcularRanking } from '../../domain/services/Ranking';

/**
 * Calcula el cuadro de honor del periodo vigente de cada grado.
 *
 * Promedio por materia = SUM((nota/notaMax) * peso) / 10 (escala 0–10)
 * Promedio general del alumno = media de sus materias con al menos una nota.
 * Se toman los `top` mejores por grado (posiciones 1..top).
 */
export class GenerarCuadroHonorUseCase {
  constructor(private readonly repo: ICalendarioRepository) {}

  async execute(top: number, userId: string) {
    const anioId = await this.repo.anioActivoId();
    if (!anioId) throw new DomainError('No hay un año lectivo activo', 409, 'SIN_ANIO_ACTIVO');

    const grados = await this.repo.gradosConPeriodoVigente(anioId);
    const resumen: { periodoId: string; entradas: number }[] = [];

    for (const { gradoId, periodoId } of grados) {
      const notas = await this.repo.notasDeGradoEnPeriodo(gradoId, periodoId, anioId);
      const ranking = calcularRanking(notas).slice(0, top);
      if (ranking.length === 0) continue;

      await this.repo.reemplazarCuadroHonor(
        anioId,
        periodoId,
        ranking.map((r, i) => ({ alumnoId: r.alumnoId, posicion: i + 1, promedioGeneral: r.promedio })),
        userId
      );
      resumen.push({ periodoId, entradas: ranking.length });
    }

    return { gradosProcesados: resumen.length, detalle: resumen };
  }
}
