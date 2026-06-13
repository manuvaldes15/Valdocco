export interface FichaData {
  alumnoId: string;
  maestroId: string;
  titulo: string;
  descripcion: string;
  gravedad: string;
  fechaEmision: Date;
}

export interface EventoData {
  titulo: string;
  descripcion?: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  tipoEvento?: string | null;
  publicoDestino?: string | null;
  gradoDestinoId?: string | null;
}

export interface AnuncioData {
  titulo: string;
  contenido: string;
  publicoDestino?: string | null;
  gradoDestinoId?: string | null;
  esDestacado?: boolean;
}

export interface RecurrenteData {
  nombre: string;
  descripcion?: string | null;
  diaSemana: number; // 1=Lunes ... 7=Domingo
  horaInicio?: string | null; // 'HH:mm'
  horaFin?: string | null;
  colorHex?: string | null;
  publicoDestino?: string | null;
}

/** Datos crudos para calcular el cuadro de honor de un grado. */
export interface NotaParaRanking {
  alumnoId: string;
  seccionMateriaId: string;
  porcentajePeso: number;
  notaMaxima: number;
  notaObtenida: number | null;
}

/** Sección de la que un maestro es guía. */
export interface SeccionGuia {
  seccionId: string;
  gradoId: string;
  nombre: string; // 'Grado · Sección'
}

export interface ICalendarioRepository {
  listarEventos(desde?: Date, hasta?: Date): Promise<unknown[]>;
  crearEvento(data: EventoData, usuarioId: string): Promise<unknown>;
  listarAnuncios(soloVigentes: boolean): Promise<unknown[]>;
  crearAnuncio(data: AnuncioData, usuarioId: string): Promise<unknown>;
  crearFicha(data: FichaData, userId: string): Promise<{ id: string }>;
  listarFichas(filtro: { alumnoId?: string; maestroId?: string; estado?: string }): Promise<unknown[]>;
  acusarFicha(id: string, userId: string): Promise<unknown>;
  resolverFicha(id: string, userId: string): Promise<unknown>;
  responsablesPrincipalesDeAlumno(alumnoId: string): Promise<string[]>; // persona ids
  maestroDePersona(personaId: string): Promise<string | null>;
  cuadroHonorActual(): Promise<unknown[]>;
  registrarAuditoria(usuarioId: string, tabla: string, idRegistro: string, accion: string, nuevos?: unknown): Promise<void>;

  // Catálogo de actividades recurrentes
  listarRecurrentes(): Promise<unknown[]>;
  crearRecurrente(data: RecurrenteData, userId: string): Promise<unknown>;
  eliminarRecurrente(id: string, userId: string): Promise<void>;

  // Generación del cuadro de honor
  anioActivoId(): Promise<string | null>;
  gradosConPeriodoVigente(anioLectivoId: string): Promise<{ gradoId: string; periodoId: string }[]>;
  notasDeGradoEnPeriodo(gradoId: string, periodoId: string, anioLectivoId: string): Promise<NotaParaRanking[]>;
  reemplazarCuadroHonor(
    anioLectivoId: string,
    periodoId: string,
    entradas: { alumnoId: string; posicion: number; promedioGeneral: number }[],
    userId: string
  ): Promise<void>;

  // Cuadro de honor por sección (docente guía)
  seccionesDondeEsGuia(maestroId: string, anioLectivoId: string): Promise<SeccionGuia[]>;
  /** Grado y año lectivo de una sección (null si no existe). */
  gradoDeSeccion(seccionId: string): Promise<{ gradoId: string; nombre: string } | null>;
  periodoVigenteDeGrado(gradoId: string, anioLectivoId: string): Promise<string | null>;
  notasDeSeccionEnPeriodo(seccionId: string, periodoId: string, anioLectivoId: string): Promise<NotaParaRanking[]>;
  alumnosDeSeccion(seccionId: string, anioLectivoId: string): Promise<string[]>;
  nombresDeAlumnos(alumnoIds: string[]): Promise<Map<string, string>>;
  /** Reemplaza, dentro de un periodo, solo las entradas de los alumnos del grupo indicado. */
  reemplazarCuadroHonorDeAlumnos(
    anioLectivoId: string,
    periodoId: string,
    alumnoIdsDelGrupo: string[],
    entradas: { alumnoId: string; posicion: number; promedioGeneral: number }[],
    userId: string
  ): Promise<void>;
}
