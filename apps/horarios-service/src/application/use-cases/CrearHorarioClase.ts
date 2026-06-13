import { DomainError } from '@valdocco/shared-types';
import { HorarioClaseData, HorarioClaseInput, IHorariosRepository } from '../../domain/repositories/IHorariosRepository';

export class CrearHorarioClaseUseCase {
  constructor(private readonly repo: IHorariosRepository) {}

  /**
   * @param soloMaestroId Si se indica, el horario debe pertenecer a ese maestro:
   *   la asignación sección-materia tiene que ser suya y el maestro del horario se
   *   fuerza a su propio id (un docente solo arma su propio horario).
   */
  async execute(input: HorarioClaseInput, userId: string, soloMaestroId?: string) {
    if (input.horaFin <= input.horaInicio) {
      throw new DomainError('La hora de fin debe ser posterior a la de inicio', 400, 'HORAS_INVALIDAS');
    }

    let maestroId = input.maestroId;
    let anioLectivoId = input.anioLectivoId;

    if (soloMaestroId) {
      const sm = await this.repo.seccionMateria(input.seccionMateriaId);
      if (!sm) throw new DomainError('La asignación sección-materia no existe', 404, 'NO_ENCONTRADO');
      if (sm.maestroId !== soloMaestroId) {
        throw new DomainError('Solo puede agendar materias asignadas a usted', 403, 'NO_ES_SU_MATERIA');
      }
      // El maestro y el año lectivo se toman de la asignación, no del cliente.
      maestroId = soloMaestroId;
      anioLectivoId = sm.anioLectivoId;
    }

    if (!maestroId || !anioLectivoId) {
      throw new DomainError('Debe indicar el maestro y el año lectivo', 400, 'DATOS_REQUERIDOS');
    }

    const data: HorarioClaseData = { ...input, maestroId, anioLectivoId };

    // REGLA CRÍTICA: verificar solapamiento de maestro Y aula antes de insertar
    const conflictos = await this.repo.buscarConflictos(data);
    if (conflictos.length > 0) {
      throw new DomainError(
        `Conflicto de horario: ${conflictos.map((c) => c.detalle).join(' | ')}`,
        409,
        'CONFLICTO_HORARIO'
      );
    }
    return this.repo.crearHorarioClase(data, userId);
  }
}
