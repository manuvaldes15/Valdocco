import { Link, NavLink, Outlet } from 'react-router-dom';
import { Cross, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/historia', label: 'Historia' },
  { to: '/mision-vision', label: 'Misión y Visión' },
  { to: '/oferta-educativa', label: 'Oferta Educativa' },
  { to: '/cuadro-honor', label: 'Cuadro de Honor' },
  { to: '/contacto', label: 'Contacto' },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
              <Cross size={18} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-primary">Valdocco</span>
              <span className="block text-[10px] uppercase tracking-widest text-secondary">CECMA Chalchuapa</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-accent-soft text-accent' : 'text-secondary hover:text-primary'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/acceso"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Acceder
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-primary">Complejo Educativo Católico "María Auxiliadora"</p>
            <p className="mt-2 text-xs leading-relaxed text-secondary">
              "Formando Buenos Cristianos y Honrados Ciudadanos" — Institución Católica Salesiana administrada por las
              religiosas Hijas del Divino Salvador.
            </p>
          </div>
          <div className="space-y-2 text-xs text-secondary">
            <p className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
              Final 10a. Av. Sur y Calle hacia el Cantón El Arado, Barrio San Sebastián, Chalchuapa, Santa Ana
            </p>
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-accent" /> 2444-0215
            </p>
            <p className="flex items-center gap-2">
              <Mail size={14} className="text-accent" /> hdsamelia24@hotmail.com
            </p>
            <a
              href="https://www.facebook.com/salesmariauxiliadora/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <Facebook size={14} /> salesmariauxiliadora
            </a>
          </div>
          <div className="text-xs text-secondary">
            <p className="font-semibold text-primary">Horario de atención</p>
            <p className="mt-2">Lunes a Viernes</p>
            <p>7:00 AM – 4:00 PM</p>
            <p className="mt-4 text-muted">Valdocco — Sistema de Seguimiento Académico</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
