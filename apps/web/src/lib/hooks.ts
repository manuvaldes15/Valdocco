import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Consultas de catálogo reutilizadas por los módulos de gestión. */

export interface SeccionCat {
  id: string;
  nombre: string;
  turno: string;
  capacidad: number;
  notaMinimaAprobacion: string;
  grado: { id: string; nombre: string; sistemaEvaluacion?: string };
}

export interface MaestroCat {
  id: string;
  especializacion: string | null;
  persona: { id: string; primerNombre: string; primerApellido: string };
}

export interface MateriaCat {
  id: string;
  nombre: string;
  codigo: string | null;
  colorHex: string | null;
}

export interface AnioLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

export function useAnioActivo() {
  return useQuery({
    queryKey: ['anio-activo'],
    queryFn: async () => (await api<AnioLectivo | null>('/api/academico/anios-lectivos/activo')).data,
    staleTime: 5 * 60_000,
  });
}

export function useSecciones() {
  return useQuery({
    queryKey: ['secciones'],
    queryFn: async () => (await api<SeccionCat[]>('/api/academico/secciones')).data,
    staleTime: 60_000,
  });
}

export function useMaestros() {
  return useQuery({
    queryKey: ['maestros-cat'],
    queryFn: async () => (await api<MaestroCat[]>('/api/personas/maestros?limit=100')).data,
    staleTime: 60_000,
  });
}

export function useMaterias() {
  return useQuery({
    queryKey: ['materias'],
    queryFn: async () => (await api<MateriaCat[]>('/api/academico/materias')).data,
    staleTime: 60_000,
  });
}

export function etiquetaSeccion(s: SeccionCat): string {
  return `${s.grado.nombre} "${s.nombre}" — ${s.turno === 'MANANA' ? 'Mañana' : 'Tarde'}`;
}

export function nombreMaestro(m: MaestroCat): string {
  return `${m.persona.primerNombre} ${m.persona.primerApellido}`;
}
