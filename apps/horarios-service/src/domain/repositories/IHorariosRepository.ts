export interface HorarioClaseData {
  maestroId: string;
  seccionMateriaId: string;
  aulaId: string;
  anioLectivoId: string;
  diaSemana: number; // 1=Lunes ... 5=Viernes
  horaInicio: string; // 'HH:mm'
  horaFin: string;
}

/**
 * Entrada al crear un horario. `maestroId` y `anioLectivoId` son opcionales:
 * cuando lo crea un MAESTRO se derivan de la asignación sección-materia.
 */
export type HorarioClaseInput = Omit<HorarioClaseData, 'maestroId' | 'anioLectivoId'> & {
  maestroId?: string;
  anioLectivoId?: string;
};

export interface ConflictoHorario {
  tipo: 'MAESTRO' | 'AULA';
  detalle: string;
}

export interface SeccionMateriaResumen {
  maestroId: string;
  anioLectivoId: string;
}

export interface IHorariosRepository {
  /** Resuelve el maestro al que pertenece una persona autenticada (null si no es maestro). */
  maestroIdDePersona(personaId: string): Promise<string | null>;
  /** Datos de la asignación sección-materia (null si no existe). */
  seccionMateria(seccionMateriaId: string): Promise<SeccionMateriaResumen | null>;
  /** Maestro dueño de un horario de clase (null si no existe). */
  maestroDeHorarioClase(id: string): Promise<string | null>;
  buscarConflictos(data: HorarioClaseData): Promise<ConflictoHorario[]>;
  crearHorarioClase(data: HorarioClaseData, userId: string): Promise<unknown>;
  listarHorarios(filtro: { maestroId?: string; aulaId?: string; anioLectivoId?: string; seccionId?: string }): Promise<unknown[]>;
  eliminarHorarioClase(id: string, userId: string): Promise<void>;
  listarAulas(): Promise<unknown[]>;
  crearAula(data: { nombre: string; capacidad?: number; edificio?: string; turnoManana?: boolean; turnoTarde?: boolean }, userId: string): Promise<unknown>;
  crearHorarioLaboral(data: { maestroId: string; anioLectivoId: string; diaSemana: number; horaEntrada: string; horaSalida: string; turno?: string }, userId: string): Promise<unknown>;
  listarHorariosLaborales(maestroId: string, anioLectivoId?: string): Promise<unknown[]>;
}
