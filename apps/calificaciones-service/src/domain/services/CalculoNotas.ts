/**
 * Lógica de negocio pura del cálculo de calificaciones.
 * Sin dependencias de Express, Prisma ni Redis.
 *
 * FÓRMULA: aporte = (nota_obtenida / nota_maxima) * porcentaje_peso
 */

export interface ActividadCalificada {
  porcentajePeso: number;
  notaMaxima: number;
  notaObtenida: number | null; // null = aún sin calificar
}

export function aporteActividad(a: ActividadCalificada): number {
  if (a.notaObtenida === null || a.notaMaxima <= 0) return 0;
  return (a.notaObtenida / a.notaMaxima) * a.porcentajePeso;
}

export interface ResumenPeriodo {
  promedioActual: number;     // suma de aportes de lo ya calificado (sobre 10)
  pesoCalificado: number;     // % del periodo ya calificado
  pesoRestante: number;       // % del periodo aún disponible
  puntosFaltantes: number;    // cuánto necesita para llegar a la nota mínima
  puedeAprobar: boolean;      // si el peso restante alcanza para aprobar
}

/**
 * Los aportes suman sobre una escala 0–100 (porcentajes); el promedio se
 * expresa sobre 10 para compararlo con la nota mínima de la sección.
 */
export function resumenPeriodo(actividades: ActividadCalificada[], notaMinima: number): ResumenPeriodo {
  const calificadas = actividades.filter((a) => a.notaObtenida !== null);
  const pesoCalificado = calificadas.reduce((s, a) => s + a.porcentajePeso, 0);
  const sumaAportes = calificadas.reduce((s, a) => s + aporteActividad(a), 0);
  const pesoTotal = actividades.reduce((s, a) => s + a.porcentajePeso, 0);
  const pesoRestante = Math.max(0, 100 - pesoCalificado);

  // promedio sobre 10: aportes/10 (p.ej. 37 pts de 100 → 3.7)
  const promedioActual = sumaAportes / 10;
  const maximoAlcanzable = (sumaAportes + Math.min(pesoRestante, Math.max(0, pesoTotal - pesoCalificado) + (100 - pesoTotal))) / 10;
  const puntosFaltantes = Math.max(0, notaMinima - promedioActual);

  return {
    promedioActual: redondear(promedioActual),
    pesoCalificado: redondear(pesoCalificado),
    pesoRestante: redondear(pesoRestante),
    puntosFaltantes: redondear(puntosFaltantes),
    puedeAprobar: maximoAlcanzable >= notaMinima,
  };
}

export function validarSumaPesos(pesoActual: number, pesoNuevo: number): boolean {
  return pesoActual + pesoNuevo <= 100;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
