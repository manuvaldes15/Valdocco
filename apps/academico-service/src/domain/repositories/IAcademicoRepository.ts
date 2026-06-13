export interface SeccionData {
  gradoId: string;
  nombre: string;
  turno: string;
  notaMinimaAprobacion?: number;
  capacidad?: number;
}

export interface MateriaData {
  nombre: string;
  codigo?: string | null;
  colorHex?: string | null;
  descripcion?: string | null;
}

export interface AsignacionData {
  seccionId: string;
  materiaId: string;
  maestroId: string;
  anioLectivoId: string;
  horasSemanales?: number;
}

export interface IAcademicoRepository {
  estructura(): Promise<unknown[]>; // niveles → ciclos → grados → secciones
  anioActivo(): Promise<unknown | null>;
  listarAniosLectivos(): Promise<unknown[]>;
  crearAnioLectivo(data: { nombre: string; fechaInicio: Date; fechaFin: Date; activo: boolean }, userId: string): Promise<unknown>;
  activarAnioLectivo(id: string, userId: string): Promise<unknown>;
  listarSecciones(gradoId?: string): Promise<unknown[]>;
  crearSeccion(data: SeccionData, userId: string): Promise<unknown>;
  existeSeccion(gradoId: string, nombre: string, turno: string): Promise<boolean>;
  listarMaterias(): Promise<unknown[]>;
  crearMateria(data: MateriaData, userId: string): Promise<unknown>;
  listarAsignaciones(filtro: { seccionId?: string; maestroId?: string; anioLectivoId?: string }): Promise<unknown[]>;
  crearAsignacion(data: AsignacionData, userId: string): Promise<unknown>;
  existeAsignacion(seccionId: string, materiaId: string, anioLectivoId: string): Promise<boolean>;
}
