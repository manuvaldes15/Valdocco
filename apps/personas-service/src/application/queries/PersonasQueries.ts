import { DomainError } from '@valdocco/shared-types';
import { IPersonasRepository, Paginacion } from '../../domain/repositories/IPersonasRepository';

/** Consultas de solo lectura (CQRS-lite): sin efectos secundarios. */
export class PersonasQueries {
  constructor(private readonly repo: IPersonasRepository) {}

  listarAlumnos(p: Paginacion) {
    return this.repo.listarAlumnos(p);
  }

  async obtenerAlumno(id: string) {
    const alumno = await this.repo.obtenerAlumno(id);
    if (!alumno) throw new DomainError('Alumno no encontrado', 404, 'NO_ENCONTRADO');
    return alumno;
  }

  listarMaestros(p: Paginacion) {
    return this.repo.listarMaestros(p);
  }

  listarResponsables(p: Paginacion) {
    return this.repo.listarResponsables(p);
  }

  misHijos(personaId: string) {
    return this.repo.hijosDeResponsable(personaId);
  }
}
