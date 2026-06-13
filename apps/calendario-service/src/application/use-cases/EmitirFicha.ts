import { CHANNEL_NOTIFICACIONES, DomainError, EventoNotificacion } from '@valdocco/shared-types';
import { FichaData, ICalendarioRepository } from '../../domain/repositories/ICalendarioRepository';

export interface IEventPublisher {
  publish(channel: string, evento: EventoNotificacion): Promise<void>;
}

export class EmitirFichaUseCase {
  constructor(
    private readonly repo: ICalendarioRepository,
    private readonly publisher: IEventPublisher
  ) {}

  /** El maestro autenticado emite una ficha; se notifica al responsable principal. */
  async execute(data: Omit<FichaData, 'maestroId'>, personaIdMaestro: string, userId: string) {
    const maestroId = await this.repo.maestroDePersona(personaIdMaestro);
    if (!maestroId) throw new DomainError('El usuario no es un maestro registrado', 403, 'NO_ES_MAESTRO');

    const ficha = await this.repo.crearFicha({ ...data, maestroId }, userId);
    await this.repo.registrarAuditoria(userId, 'fichas_atencion', ficha.id, 'INSERT', data);

    const destinatarios = await this.repo.responsablesPrincipalesDeAlumno(data.alumnoId);
    await this.publisher.publish(CHANNEL_NOTIFICACIONES, {
      tipo: 'FICHA_CREADA',
      titulo: `Ficha de atención: ${data.titulo}`,
      mensaje: `Se emitió una ficha de gravedad ${data.gravedad} para su hijo(a). Ingrese al portal para más detalles.`,
      destinatarioPersonaIds: destinatarios,
      referenciaId: ficha.id,
      emitidoEn: new Date().toISOString(),
    });
    return ficha;
  }
}
