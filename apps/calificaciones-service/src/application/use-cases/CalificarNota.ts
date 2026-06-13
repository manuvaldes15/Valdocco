import { CHANNEL_NOTIFICACIONES, DomainError, EventoNotificacion } from '@valdocco/shared-types';
import { ICalificacionesRepository } from '../../domain/repositories/ICalificacionesRepository';

export interface IEventPublisher {
  publish(channel: string, evento: EventoNotificacion): Promise<void>;
}

export class CalificarNotaUseCase {
  constructor(
    private readonly repo: ICalificacionesRepository,
    private readonly publisher: IEventPublisher
  ) {}

  async execute(
    input: { actividadId: string; alumnoId: string; nota: number; comentario?: string | null },
    userId: string
  ) {
    const actividad = await this.repo.obtenerActividad(input.actividadId);
    if (!actividad) throw new DomainError('Actividad no encontrada', 404, 'NO_ENCONTRADO');
    if (input.nota < 0 || input.nota > actividad.notaMaxima) {
      throw new DomainError(
        `La nota debe estar entre 0 y ${actividad.notaMaxima}`,
        400,
        'NOTA_FUERA_DE_RANGO'
      );
    }

    const nota = await this.repo.calificarNota(
      input.actividadId,
      input.alumnoId,
      input.nota,
      input.comentario ?? null,
      userId
    );
    await this.repo.registrarAuditoria(userId, 'notas_actividades', nota.id, 'UPDATE', input);

    // Evento asíncrono: el notificaciones-service avisará al responsable
    await this.publisher.publish(CHANNEL_NOTIFICACIONES, {
      tipo: 'NOTA_PUBLICADA',
      titulo: 'Nueva calificación registrada',
      mensaje: 'Se registró una nueva calificación para su hijo(a).',
      destinatarioPersonaIds: [],
      referenciaId: nota.id,
      emitidoEn: new Date().toISOString(),
    });

    return nota;
  }
}
