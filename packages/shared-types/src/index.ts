// ============================================================
// VALDOCCO — Tipos compartidos entre microservicios y frontend
// ============================================================

export type Rol = 'ADMIN' | 'DIRECTOR' | 'MAESTRO' | 'RESPONSABLE' | 'ALUMNO';

export type Turno = 'MANANA' | 'TARDE';
export type Genero = 'M' | 'F' | 'OTRO';
export type SistemaEvaluacion = 'TRIMESTRAL' | 'PERIODOS';
export type EstadoInscripcion = 'ACTIVO' | 'RETIRADO' | 'TRASLADADO' | 'GRADUADO';
export type TipoRelacion = 'PADRE' | 'MADRE' | 'TUTOR' | 'OTRO';
export type TipoContrato = 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'CONTRATO';
export type TipoActividad = 'EXAMEN' | 'TAREA' | 'PROYECTO' | 'QUIZ' | 'PARTICIPACION' | 'OTRO';
export type EstadoNota = 'PENDIENTE' | 'ENTREGADO' | 'CALIFICADO' | 'EXIMIDO';
export type GravedadFicha = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type EstadoFicha = 'ABIERTA' | 'ACUSADA' | 'RESUELTA' | 'ARCHIVADA';
export type TipoEvento = 'ACADEMICO' | 'INSTITUCIONAL' | 'FERIADO' | 'EVALUACION';
export type PublicoDestino = 'TODOS' | 'MAESTROS' | 'ALUMNOS' | 'PADRES';
export type AccionAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

export interface JwtPayload {
  sub: string; // user_id (UUID)
  role: Rol;
  personId: string;
  iat?: number;
  exp?: number;
}

// Headers internos inyectados por el gateway
export const HEADER_USER_ID = 'x-user-id';
export const HEADER_USER_ROLE = 'x-user-role';
export const HEADER_PERSON_ID = 'x-person-id';
export const HEADER_INTERNAL_SECRET = 'x-internal-secret';

// Respuesta HTTP estándar
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Error de dominio tipado — usar siempre en lugar de Error genérico
export class DomainError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code: string = 'DOMAIN_ERROR'
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

// Canales Redis pub/sub
export const CHANNEL_NOTIFICACIONES = 'valdocco:notificaciones';

export interface EventoNotificacion {
  tipo: 'FICHA_CREADA' | 'NOTA_PUBLICADA' | 'ANUNCIO_PUBLICADO' | 'EVENTO_CREADO';
  titulo: string;
  mensaje: string;
  destinatarioPersonaIds: string[]; // vacío = broadcast según publico
  publico?: PublicoDestino;
  referenciaId?: string;
  emitidoEn: string; // ISO
}
