import { DomainError } from '@valdocco/shared-types';
import { IInscripcionRepository, InscripcionData } from '../../domain/repositories/IInscripcionRepository';

export class MatricularAlumnoUseCase {
  constructor(private readonly repo: IInscripcionRepository) {}

  async execute(data: InscripcionData, userId: string) {
    // Regla: un alumno solo puede tener UNA inscripción ACTIVA por año lectivo
    const yaInscrito = await this.repo.findActiva(data.alumnoId, data.anioLectivoId);
    if (yaInscrito) {
      throw new DomainError('El alumno ya tiene una inscripción activa este año', 409, 'YA_INSCRITO');
    }
    // Regla: respetar la capacidad de la sección
    const [ocupados, capacidad] = await Promise.all([
      this.repo.contarActivasEnSeccion(data.seccionId, data.anioLectivoId),
      this.repo.capacidadSeccion(data.seccionId),
    ]);
    if (capacidad !== null && ocupados >= capacidad) {
      throw new DomainError('La sección alcanzó su capacidad máxima', 409, 'SECCION_LLENA');
    }
    const inscripcion = (await this.repo.crear(data, userId)) as { id: string };
    await this.repo.registrarAuditoria(userId, inscripcion.id, 'INSERT', data);
    return inscripcion;
  }
}

export class RetirarAlumnoUseCase {
  constructor(private readonly repo: IInscripcionRepository) {}

  async execute(id: string, fechaRetiro: Date, motivo: string, userId: string) {
    const existente = await this.repo.obtener(id);
    if (!existente) throw new DomainError('Inscripción no encontrada', 404, 'NO_ENCONTRADO');
    const actualizada = await this.repo.retirar(id, fechaRetiro, motivo, userId);
    await this.repo.registrarAuditoria(userId, id, 'UPDATE', { estado: 'RETIRADO', motivo });
    return actualizada;
  }
}

export class CambiarTurnoUseCase {
  constructor(private readonly repo: IInscripcionRepository) {}

  async execute(id: string, nuevaSeccionId: string, turno: string, fecha: Date, userId: string) {
    const existente = await this.repo.obtener(id);
    if (!existente) throw new DomainError('Inscripción no encontrada', 404, 'NO_ENCONTRADO');
    const actualizada = await this.repo.cambiarTurno(id, nuevaSeccionId, turno, fecha, userId);
    await this.repo.registrarAuditoria(userId, id, 'UPDATE', { turnoTraslado: turno, nuevaSeccionId });
    return actualizada;
  }
}
