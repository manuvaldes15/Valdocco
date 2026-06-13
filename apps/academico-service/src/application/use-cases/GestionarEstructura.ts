import { DomainError } from '@valdocco/shared-types';
import {
  AsignacionData,
  IAcademicoRepository,
  MateriaData,
  SeccionData,
} from '../../domain/repositories/IAcademicoRepository';

export class CrearSeccionUseCase {
  constructor(private readonly repo: IAcademicoRepository) {}

  async execute(data: SeccionData, userId: string) {
    const duplicada = await this.repo.existeSeccion(data.gradoId, data.nombre, data.turno);
    if (duplicada) {
      throw new DomainError('Ya existe esa sección para el grado y turno indicados', 409, 'SECCION_DUPLICADA');
    }
    return this.repo.crearSeccion(data, userId);
  }
}

export class CrearMateriaUseCase {
  constructor(private readonly repo: IAcademicoRepository) {}

  execute(data: MateriaData, userId: string) {
    return this.repo.crearMateria(data, userId);
  }
}

export class CrearAsignacionUseCase {
  constructor(private readonly repo: IAcademicoRepository) {}

  async execute(data: AsignacionData, userId: string) {
    const duplicada = await this.repo.existeAsignacion(data.seccionId, data.materiaId, data.anioLectivoId);
    if (duplicada) {
      throw new DomainError('La materia ya está asignada a esa sección este año', 409, 'ASIGNACION_DUPLICADA');
    }
    return this.repo.crearAsignacion(data, userId);
  }
}

export class CrearAnioLectivoUseCase {
  constructor(private readonly repo: IAcademicoRepository) {}

  execute(data: { nombre: string; fechaInicio: Date; fechaFin: Date; activo: boolean }, userId: string) {
    if (data.fechaFin <= data.fechaInicio) {
      throw new DomainError('La fecha de fin debe ser posterior a la de inicio', 400, 'FECHAS_INVALIDAS');
    }
    return this.repo.crearAnioLectivo(data, userId);
  }
}
