import { DomainError } from '@valdocco/shared-types';
import { ActividadData, ICalificacionesRepository } from '../../domain/repositories/ICalificacionesRepository';
import { validarSumaPesos } from '../../domain/services/CalculoNotas';

export class CrearActividadUseCase {
  constructor(private readonly repo: ICalificacionesRepository) {}

  async execute(data: ActividadData, userId: string) {
    // Regla: la suma de pesos del periodo no puede superar el 100%
    const pesoActual = await this.repo.sumaPesosPorPeriodo(data.seccionMateriaId, data.periodoEvaluacionId);
    if (!validarSumaPesos(pesoActual, data.porcentajePeso)) {
      throw new DomainError(
        `La suma de pesos del periodo superaría el 100% (actual: ${pesoActual}%)`,
        400,
        'PESO_EXCEDIDO'
      );
    }

    const actividad = await this.repo.crearActividad(data, userId);

    // Regla: generar registro PENDIENTE para cada alumno inscrito en la sección
    const alumnoIds = await this.repo.alumnosActivosDeSeccionMateria(data.seccionMateriaId);
    if (alumnoIds.length > 0) {
      await this.repo.crearNotasPendientes(actividad.id, alumnoIds, userId);
    }

    await this.repo.registrarAuditoria(userId, 'actividades', actividad.id, 'INSERT', data);
    return actividad;
  }
}
