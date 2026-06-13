import {
  AlumnoDetalleData,
  IAuditoriaRepository,
  IPersonasRepository,
  PersonaData,
} from '../../domain/repositories/IPersonasRepository';

export class CrearAlumnoUseCase {
  constructor(
    private readonly repo: IPersonasRepository,
    private readonly auditoria: IAuditoriaRepository
  ) {}

  async execute(persona: PersonaData, detalle: AlumnoDetalleData, userId: string) {
    const alumno = (await this.repo.crearAlumno(persona, detalle, userId)) as { id: string };
    await this.auditoria.registrar(userId, 'alumnos', alumno.id, 'INSERT', undefined, { persona, detalle });
    return alumno;
  }
}

/**
 * Un RESPONSABLE registra a su propio hijo. Evita que el docente tenga que crear
 * a los alumnos uno por uno: el padre/tutor da de alta al alumno y queda vinculado
 * automáticamente como responsable principal.
 */
export class RegistrarHijoUseCase {
  constructor(
    private readonly repo: IPersonasRepository,
    private readonly auditoria: IAuditoriaRepository
  ) {}

  async execute(persona: PersonaData, detalle: AlumnoDetalleData, personaIdResponsable: string, userId: string) {
    const alumno = (await this.repo.crearHijoDeResponsable(
      persona,
      detalle,
      personaIdResponsable,
      userId
    )) as { id: string };
    await this.auditoria.registrar(userId, 'alumnos', alumno.id, 'INSERT', undefined, { persona, detalle, registradoPor: 'RESPONSABLE' });
    return alumno;
  }
}

export class ActualizarAlumnoUseCase {
  constructor(
    private readonly repo: IPersonasRepository,
    private readonly auditoria: IAuditoriaRepository
  ) {}

  async execute(id: string, persona: Partial<PersonaData>, detalle: AlumnoDetalleData, userId: string) {
    const alumno = await this.repo.actualizarAlumno(id, persona, detalle, userId);
    await this.auditoria.registrar(userId, 'alumnos', id, 'UPDATE', undefined, { persona, detalle });
    return alumno;
  }
}

export class EliminarAlumnoUseCase {
  constructor(
    private readonly repo: IPersonasRepository,
    private readonly auditoria: IAuditoriaRepository
  ) {}

  async execute(id: string, userId: string) {
    await this.repo.eliminarAlumno(id, userId);
    await this.auditoria.registrar(userId, 'alumnos', id, 'DELETE');
  }
}
