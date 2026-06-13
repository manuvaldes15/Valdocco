import { Clock, Facebook, Mail, MapPin, Phone, User } from 'lucide-react';

const datos = [
  {
    icon: MapPin,
    titulo: 'Dirección',
    lineas: [
      'Final 10a. Av. Sur y Calle hacia el Cantón El Arado,',
      'Barrio San Sebastián, Chalchuapa, Santa Ana, El Salvador',
    ],
  },
  { icon: Phone, titulo: 'Teléfono institucional', lineas: ['2444-0215'] },
  { icon: Mail, titulo: 'Correo de dirección', lineas: ['hdsamelia24@hotmail.com'] },
  {
    icon: User,
    titulo: 'Comunicaciones',
    lineas: ['María Magdalena Méndez', 'mendezhds81@yahoo.es — 7930-2740'],
  },
  { icon: Clock, titulo: 'Horario de atención', lineas: ['Lunes a Viernes', '7:00 AM – 4:00 PM'] },
  { icon: Facebook, titulo: 'Facebook', lineas: ['facebook.com/salesmariauxiliadora'] },
];

export function Contacto() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-extrabold text-primary lg:text-4xl">Contacto</h1>
      <p className="mt-4 max-w-2xl text-secondary">
        Estamos para servirle. Visítenos o comuníquese con nosotros por cualquiera de estos medios.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {datos.map((d) => (
          <div key={d.titulo} className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <d.icon size={18} />
            </span>
            <h2 className="mt-3 text-sm font-bold text-primary">{d.titulo}</h2>
            {d.lineas.map((l) => (
              <p key={l} className="mt-1 text-sm text-secondary">
                {l}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-line shadow-card">
        <iframe
          title="Ubicación del CECMA"
          src="https://www.google.com/maps?q=X8J8%2B5M7%2C+10a+Av+Sur%2C+Chalchuapa&output=embed"
          className="h-80 w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
