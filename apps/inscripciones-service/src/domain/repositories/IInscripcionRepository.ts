export interface InscripcionData {
  alumnoId: string;
  seccionId: string;
  anioLectivoId: string;
  maestroGuiaId: string;
  fechaInscripcion: Date;
}

export interface IInscripcionRepository {
  /** Resuelve el maestro al que pertenece una persona autenticada (null si no es maestro). */
  maestroIdDePersona(personaId: string): Promise<string | null>;
  findActiva(alumnoId: string, anioLectivoId: string): Promise<{ id: string } | null>;
  contarActivasEnSeccion(seccionId: string, anioLectivoId: string): Promise<number>;
  capacidadSeccion(seccionId: string): Promise<number | null>;
  crear(data: InscripcionData, userId: string): Promise<unknown>;
  listar(filtro: { seccionId?: string; anioLectivoId?: string; estado?: string }, page: number, limit: number): Promise<{ items: unknown[]; total: number }>;
  obtener(id: string): Promise<unknown | null>;
  retirar(id: string, fechaRetiro: Date, motivo: string, userId: string): Promise<unknown>;
  cambiarTurno(id: string, nuevaSeccionId: string, turno: string, fecha: Date, userId: string): Promise<unknown>;
  registrarAuditoria(usuarioId: string, idRegistro: string, accion: string, nuevos?: unknown): Promise<void>;
}
