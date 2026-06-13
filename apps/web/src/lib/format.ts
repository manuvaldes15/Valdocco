export function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatearFechaLarga(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function nombreCompleto(persona: {
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
}): string {
  return [persona.primerNombre, persona.primerApellido, persona.segundoApellido].filter(Boolean).join(' ');
}
