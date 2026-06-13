import PDFDocument from 'pdfkit';

export interface DatosLibreta {
  institucion: string;
  direccion: string;
  telefono: string;
  anioLectivo: string;
  alumno: { nombre: string; codigo: string };
  seccion: string;
  maestroGuia: string;
  notaMinima: number;
  periodos: string[];
  materias: { nombre: string; porPeriodo: (number | null)[]; promedio: number | null }[];
}

const AZUL = '#1e3a6e';
const ACENTO = '#2563eb';
const GRIS = '#475569';
const ROJO = '#dc2626';
const VERDE = '#059669';

/** Genera la libreta de calificaciones como stream PDF (carta, vertical). */
export function generarLibretaPdf(datos: DatosLibreta): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const ancho = doc.page.width - 100;

  // ── Encabezado institucional ──
  doc.rect(50, 50, ancho, 70).fill(AZUL);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(14).text(datos.institucion, 60, 62, { width: ancho - 20 });
  doc.font('Helvetica').fontSize(8).text(`${datos.direccion}  ·  Tel. ${datos.telefono}`, 60, 82, { width: ancho - 20 });
  doc.fontSize(10).font('Helvetica-Bold').text(`LIBRETA DE CALIFICACIONES — AÑO LECTIVO ${datos.anioLectivo}`, 60, 100);

  // ── Datos del alumno ──
  let y = 140;
  const dato = (etiqueta: string, valor: string, x: number, anchoCol: number) => {
    doc.fillColor(GRIS).font('Helvetica').fontSize(7).text(etiqueta.toUpperCase(), x, y, { width: anchoCol });
    doc.fillColor('black').font('Helvetica-Bold').fontSize(10).text(valor, x, y + 10, { width: anchoCol });
  };
  dato('Alumno', datos.alumno.nombre, 50, 250);
  dato('Código', datos.alumno.codigo, 310, 100);
  dato('Nota mínima', datos.notaMinima.toFixed(1), 420, 100);
  y += 32;
  dato('Grado y sección', datos.seccion, 50, 250);
  dato('Maestro guía', datos.maestroGuia, 310, 210);
  y += 45;

  // ── Tabla de calificaciones ──
  const colMateria = 180;
  const numCols = datos.periodos.length + 1; // periodos + promedio
  const colNota = (ancho - colMateria) / numCols;
  const filaAlto = 24;

  // Encabezado de tabla
  doc.rect(50, y, ancho, filaAlto).fill(AZUL);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8);
  doc.text('MATERIA', 58, y + 8, { width: colMateria - 16 });
  datos.periodos.forEach((p, i) => {
    doc.text(p.toUpperCase(), 50 + colMateria + i * colNota, y + 8, { width: colNota, align: 'center' });
  });
  doc.text('PROMEDIO', 50 + colMateria + datos.periodos.length * colNota, y + 8, { width: colNota, align: 'center' });
  y += filaAlto;

  // Filas
  doc.font('Helvetica').fontSize(9);
  datos.materias.forEach((m, idx) => {
    if (idx % 2 === 0) doc.rect(50, y, ancho, filaAlto).fill('#f1f5f9');
    doc.fillColor('black').font('Helvetica').text(m.nombre, 58, y + 8, { width: colMateria - 16 });
    m.porPeriodo.forEach((nota, i) => {
      const x = 50 + colMateria + i * colNota;
      if (nota === null) {
        doc.fillColor(GRIS).text('—', x, y + 8, { width: colNota, align: 'center' });
      } else {
        doc
          .fillColor(nota >= datos.notaMinima ? 'black' : ROJO)
          .font('Helvetica-Bold')
          .text(nota.toFixed(1), x, y + 8, { width: colNota, align: 'center' })
          .font('Helvetica');
      }
    });
    const xProm = 50 + colMateria + datos.periodos.length * colNota;
    if (m.promedio === null) {
      doc.fillColor(GRIS).text('—', xProm, y + 8, { width: colNota, align: 'center' });
    } else {
      doc
        .fillColor(m.promedio >= datos.notaMinima ? VERDE : ROJO)
        .font('Helvetica-Bold')
        .text(m.promedio.toFixed(1), xProm, y + 8, { width: colNota, align: 'center' })
        .font('Helvetica');
    }
    y += filaAlto;
  });

  // Borde de la tabla
  doc.rect(50, y - filaAlto * (datos.materias.length + 1), ancho, filaAlto * (datos.materias.length + 1)).stroke('#cbd5e1');

  // ── Promedio general ──
  const promedios = datos.materias.map((m) => m.promedio).filter((v): v is number => v !== null);
  if (promedios.length > 0) {
    const general = Math.round((promedios.reduce((s, v) => s + v, 0) / promedios.length) * 100) / 100;
    y += 14;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(AZUL).text('PROMEDIO GENERAL:', 50, y);
    doc.fillColor(general >= datos.notaMinima ? VERDE : ROJO).fontSize(13).text(general.toFixed(2), 175, y - 2);
  }

  // ── Firmas y pie ──
  y = doc.page.height - 140;
  const firma = (texto: string, x: number) => {
    doc.moveTo(x, y).lineTo(x + 150, y).stroke(GRIS);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS).text(texto, x, y + 5, { width: 150, align: 'center' });
  };
  firma('Maestro(a) guía', 60);
  firma('Dirección', 230);
  firma('Padre o responsable', 400);

  doc
    .fontSize(7)
    .fillColor(GRIS)
    .text(
      `Documento generado por Valdocco el ${new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' })}. "Formando Buenos Cristianos y Honrados Ciudadanos".`,
      50,
      doc.page.height - 70,
      { width: ancho, align: 'center' }
    );

  doc.end();
  return doc;
}
