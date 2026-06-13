/**
 * Puertos de salida del dominio de personas.
 * Las implementaciones Prisma viven en infrastructure/persistence.
 */

export interface PersonaData {
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  fechaNacimiento?: Date | null;
  genero?: string | null;
  dui?: string | null;
  email?: string | null;
  telefono?: string | null;
  telefonoAlt?: string | null;
  direccion?: string | null;
  profesion?: string | null;
  nacionalidad?: string | null;
}

export interface AlumnoDetalleData {
  tipoSangre?: string | null;
  alergias?: string | null;
  condicionesMedicas?: string | null;
  necesidadesEspeciales?: string | null;
  nombreContactoEmergencia?: string | null;
  telefonoContactoEmergencia?: string | null;
}

export interface Paginacion {
  page: number;
  limit: number;
  buscar?: string;
}

export interface IPersonasRepository {
  listarAlumnos(p: Paginacion): Promise<{ items: unknown[]; total: number }>;
  obtenerAlumno(id: string): Promise<unknown | null>;
  crearAlumno(persona: PersonaData, detalle: AlumnoDetalleData, userId: string): Promise<unknown>;
  actualizarAlumno(id: string, persona: Partial<PersonaData>, detalle: AlumnoDetalleData, userId: string): Promise<unknown>;
  eliminarAlumno(id: string, userId: string): Promise<void>;
  listarMaestros(p: Paginacion): Promise<{ items: unknown[]; total: number }>;
  crearMaestro(persona: PersonaData, detalle: { codigoMaestro?: string; especializacion?: string; tipoContrato?: string }, userId: string): Promise<unknown>;
  listarResponsables(p: Paginacion): Promise<{ items: unknown[]; total: number }>;
  crearResponsable(persona: PersonaData, tipoRelacion: string, userId: string): Promise<unknown>;
  vincularResponsable(alumnoId: string, responsableId: string, esPrincipal: boolean, userId: string): Promise<unknown>;
  /**
   * Crea un alumno y lo vincula como hijo del responsable dueño de `personaIdResponsable`.
   * Si esa persona aún no tiene registro de responsable, lo crea. Operación atómica.
   */
  crearHijoDeResponsable(
    persona: PersonaData,
    detalle: AlumnoDetalleData,
    personaIdResponsable: string,
    userId: string
  ): Promise<unknown>;
  hijosDeResponsable(personaId: string): Promise<unknown[]>;
  crearUsuario(input: { personaId: string; nombreUsuario: string; email: string; contrasenaHash: string; rol: string }, userId: string): Promise<unknown>;
  existeUsuario(email: string, nombreUsuario: string): Promise<boolean>;
}

export interface IAuditoriaRepository {
  registrar(usuarioId: string, tabla: string, idRegistro: string, accion: string, anteriores?: unknown, nuevos?: unknown): Promise<void>;
}
