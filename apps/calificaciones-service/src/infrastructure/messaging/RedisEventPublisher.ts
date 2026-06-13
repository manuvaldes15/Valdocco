import Redis from 'ioredis';
import { EventoNotificacion } from '@valdocco/shared-types';
import { IEventPublisher } from '../../application/use-cases/CalificarNota';
import { env } from '../config/env';

export class RedisEventPublisher implements IEventPublisher {
  private redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

  async publish(channel: string, evento: EventoNotificacion): Promise<void> {
    try {
      await this.redis.publish(channel, JSON.stringify(evento));
    } catch {
      // La publicación de eventos no debe romper la operación principal
    }
  }
}
