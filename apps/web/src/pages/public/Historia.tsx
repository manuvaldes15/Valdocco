const hitos = [
  {
    anio: '1912',
    texto:
      'Llegada de las Hijas de María Auxiliadora a Chalchuapa, invitadas por Don Salvador Morán. La obra inicia como "Hospicio Santa Rosa".',
  },
  { anio: '1924', texto: 'La obra se inscribe oficialmente como Colegio María Auxiliadora.' },
  {
    anio: '1976',
    texto: 'La presencia salesiana había formado dieciocho Hijas de María Auxiliadora y otras vocaciones religiosas.',
  },
  {
    anio: '1980',
    texto:
      'El 16 de febrero se funda el Complejo Educativo bajo su nombre actual por Mons. Pedro Arnoldo Aparicio Quintanilla. Primera directora: Hna. María Zoila Acosta; primeras maestras: Hna. Sonia Eureistele Pérez y Hna. Juana Antonia Rivas. Comenzó con 80 alumnos en parvularia, primero, segundo y tercer grado. Ese mismo año la obra fue entregada en comodato a las Hijas del Divino Salvador.',
  },
  { anio: '1990', texto: 'A finales de la década, traslado al local actual.' },
  { anio: '1991', texto: 'El 29 de junio se reinaugura el local actual.' },
  { anio: '2000', texto: 'Inicio del Bachillerato General.' },
  { anio: '2001', texto: 'Egreso de la primera promoción de bachilleres.' },
  {
    anio: 'Hoy',
    texto:
      'Con 809 alumnos, 32 docentes y 10 religiosas HDS, la institución mantiene una presencia sólida en la comunidad de Chalchuapa y sus alrededores.',
  },
];

export function Historia() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <span className="text-xs font-semibold uppercase tracking-widest text-accent">Desde 1912</span>
      <h1 className="mt-2 text-3xl font-extrabold text-primary lg:text-4xl">Nuestra historia</h1>
      <p className="mt-4 max-w-2xl text-secondary">
        Más de un siglo de presencia salesiana en Chalchuapa, formando generaciones con la pedagogía del amor de Don
        Bosco y bajo la protección de María Auxiliadora.
      </p>

      <ol className="relative mt-12 space-y-10 border-l border-line pl-8">
        {hitos.map((h) => (
          <li key={h.anio} className="relative">
            <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border border-accent bg-base">
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
            <p className="font-mono text-sm font-semibold text-accent">{h.anio}</p>
            <p className="mt-1 text-sm leading-relaxed text-secondary">{h.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
