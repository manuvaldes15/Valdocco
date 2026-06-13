export interface ActividadData {
  seccionMateriaId: string;
  periodoEvaluacionId: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  porcentajePeso: number;
  notaMaxima: number;
  fechaEntrega?: Date | null;
}

export interface ICalificacionesRepository {
  /** Resuelve el maestro al que pertenece una persona autenticada (null si no es maestro). */
  maestroIdDePersona(personaId: string): Promise<string | null>;
  /** Maestro dueño de una asignación sección-materia (null si no existe). */
  maestroDeSeccionMateria(seccionMateriaId: string): Promise<string | null>;
  /** Maestro dueño de la asignación a la que pertenece una actividad (null si no existe). */
  maestroDeActividad(actividadId: string): Promise<string | null>;
  sumaPesosPorPeriodo(seccionMateriaId: string, periodoEvaluacionId: string): Promise<number>;
  crearActividad(data: ActividadData, userId: string): Promise<{ id: string }>;
  alumnosActivosDeSeccionMateria(seccionMateriaId: string): Promise<string[]>;
  crearNotasPendientes(actividadId: string, alumnoIds: string[], userId: string): Promise<void>;
  listarActividades(filtro: { seccionMateriaId?: string; periodoEvaluacionId?: string }): Promise<unknown[]>;
  obtenerActividad(id: string): Promise<{ id: string; notaMaxima: number } | null>;
  listarNotasDeActividad(actividadId: string): Promise<unknown[]>;
  calificarNota(actividadId: string, alumnoId: string, nota: number, comentario: string | null, userId: string): Promise<{ id: string }>;
  actividadesCalificadasDeAlumno(alumnoId: string, seccionMateriaId: string, periodoEvaluacionId: string): Promise<{ porcentajePeso: number; notaMaxima: number; notaObtenida: number | null }[]>;
  notaMinimaDeSeccionMateria(seccionMateriaId: string): Promise<number>;
  listarPeriodos(gradoId: string, anioLectivoId?: string): Promise<unknown[]>;
  resumenAlumno(alumnoId: string, anioLectivoId: string): Promise<unknown>;
  registrarAuditoria(usuarioId: string, tabla: string, idRegistro: string, accion: string, nuevos?: unknown): Promise<void>;
}
