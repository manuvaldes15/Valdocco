import { z } from 'zod';

export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
});

export const personaSchema = z.object({
  primerNombre: z.string().min(1).max(100),
  segundoNombre: z.string().max(100).optional().nullable(),
  primerApellido: z.string().min(1).max(100),
  segundoApellido: z.string().max(100).optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  genero: z.enum(['M', 'F', 'OTRO']).optional().nullable(),
  dui: z.string().max(20).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  telefonoAlt: z.string().max(20).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  profesion: z.string().max(200).optional().nullable(),
  nacionalidad: z.string().max(100).optional().nullable(),
});

export const alumnoDetalleSchema = z.object({
  tipoSangre: z.string().max(5).optional().nullable(),
  alergias: z.string().max(1000).optional().nullable(),
  condicionesMedicas: z.string().max(1000).optional().nullable(),
  necesidadesEspeciales: z.string().max(1000).optional().nullable(),
  nombreContactoEmergencia: z.string().max(200).optional().nullable(),
  telefonoContactoEmergencia: z.string().max(20).optional().nullable(),
});

export const crearAlumnoSchema = z.object({
  persona: personaSchema,
  detalle: alumnoDetalleSchema.default({}),
});

export const crearMaestroSchema = z.object({
  persona: personaSchema,
  detalle: z.object({
    codigoMaestro: z.string().max(30).optional(),
    especializacion: z.string().max(200).optional(),
    tipoContrato: z.enum(['TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'CONTRATO']).optional(),
  }).default({}),
});

export const crearResponsableSchema = z.object({
  persona: personaSchema,
  tipoRelacion: z.enum(['PADRE', 'MADRE', 'TUTOR', 'OTRO']),
});

export const vincularSchema = z.object({
  alumnoId: z.string().uuid(),
  responsableId: z.string().uuid(),
  esPrincipal: z.boolean().default(false),
});

export const crearUsuarioSchema = z.object({
  personaId: z.string().uuid(),
  nombreUsuario: z.string().min(3).max(100),
  email: z.string().email().max(200),
  contrasena: z.string().min(10).max(200),
  rol: z.enum(['ADMIN', 'DIRECTOR', 'MAESTRO', 'RESPONSABLE', 'ALUMNO']),
});
