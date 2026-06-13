import { DomainError } from '@valdocco/shared-types';
import { ICalendarioRepository } from '../../domain/repositories/ICalendarioRepository';
import { calcularRanking } from '../../domain/services/Ranking';

export interface EntradaCuadroHonor {
  posicion: number;
  alumnoId: string;
  alumno: string;
  promedioGeneral: number;
}

/**
 * Cuadro de honor a cargo del docente guía de una sección.
 * Permite ver (previsualizar, sin persistir) y publicar (persistir) el ranking de
 * SU sección en el periodo vigente, sin afectar el de otras secciones del grado.
 */
export class CuadroHonorSeccionUseCase {
  constructor(private readonly repo: ICalendarioRepository) {}

  /** Secciones de las que el maestro es guía en el año activo. */
  async misSecciones(maestroId: string) {
    const anioId = await this.repo.anioActivoId();
    if (!anioId) return [];
    return this.repo.seccionesDondeEsGuia(maestroId, anioId);
  }

  /** Calcula el ranking de la sección sin persistirlo. */
  async previsualizar(seccionId: string, top: number, maestroIdRestriccion: string | null) {
    const { anioId, periodoId } = await this.contexto(seccionId, maestroIdRestriccion);
    const notas = await this.repo.notasDeSeccionEnPeriodo(seccionId, periodoId, anioId);
    const ranking = calcularRanking(notas).slice(0, top);
    const nombres = await this.repo.nombresDeAlumnos(ranking.map((r) => r.alumnoId));
    const entradas: EntradaCuadroHonor[] = ranking.map((r, i) => ({
      posicion: i + 1,
      alumnoId: r.alumnoId,
      alumno: nombres.get(r.alumnoId) ?? '—',
      promedioGeneral: r.promedio,
    }));
    return { periodoId, entradas };
  }

  /** Publica el cuadro de honor de la sección (lo deja visible en la plataforma). */
  async publicar(seccionId: string, top: number, maestroIdRestriccion: string | null, userId: string) {
    const { anioId, periodoId } = await this.contexto(seccionId, maestroIdRestriccion);
    const notas = await this.repo.notasDeSeccionEnPeriodo(seccionId, periodoId, anioId);
    const ranking = calcularRanking(notas).slice(0, top);
    if (ranking.length === 0) {
      throw new DomainError('No hay notas calificadas suficientes para publicar el cuadro de honor', 409, 'SIN_NOTAS');
    }
    const alumnosSeccion = await this.repo.alumnosDeSeccion(seccionId, anioId);
    await this.repo.reemplazarCuadroHonorDeAlumnos(
      anioId,
      periodoId,
      alumnosSeccion,
      ranking.map((r, i) => ({ alumnoId: r.alumnoId, posicion: i + 1, promedioGeneral: r.promedio })),
      userId
    );
    return { seccionId, periodoId, publicados: ranking.length };
  }

  /** Resuelve año activo + periodo vigente y valida que el maestro sea guía de la sección. */
  private async contexto(seccionId: string, maestroIdRestriccion: string | null) {
    const anioId = await this.repo.anioActivoId();
    if (!anioId) throw new DomainError('No hay un año lectivo activo', 409, 'SIN_ANIO_ACTIVO');

    const grado = await this.repo.gradoDeSeccion(seccionId);
    if (!grado) throw new DomainError('La sección no existe', 404, 'NO_ENCONTRADO');

    if (maestroIdRestriccion) {
      const secciones = await this.repo.seccionesDondeEsGuia(maestroIdRestriccion, anioId);
      if (!secciones.some((s) => s.seccionId === seccionId)) {
        throw new DomainError('Solo el docente guía de la sección puede gestionar su cuadro de honor', 403, 'NO_ES_GUIA');
      }
    }

    const periodoId = await this.repo.periodoVigenteDeGrado(grado.gradoId, anioId);
    if (!periodoId) throw new DomainError('El grado no tiene un periodo de evaluación vigente', 409, 'SIN_PERIODO');

    return { anioId, periodoId };
  }
}
