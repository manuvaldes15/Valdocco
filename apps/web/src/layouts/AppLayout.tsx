import { useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Clock,
  ClipboardList,
  Cross,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { logout } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { Spinner } from '../components/ui';

const menuGestion = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/alumnos', label: 'Alumnos', icon: GraduationCap },
  { to: '/app/matricula', label: 'Matrícula', icon: BookOpenCheck },
  { to: '/app/calificaciones', label: 'Calificaciones', icon: ClipboardList },
  { to: '/app/estructura', label: 'Estructura', icon: Layers },
  { to: '/app/horarios', label: 'Horarios', icon: Clock },
  { to: '/app/comunidad', label: 'Comunidad', icon: UserSquare2 },
  { to: '/app/fichas', label: 'Fichas', icon: ClipboardList },
  { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
];

const menuPorRol: Record<string, { to: string; label: string; icon: typeof LayoutDashboard }[]> = {
  ADMIN: menuGestion,
  DIRECTOR: menuGestion,
  MAESTRO: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/alumnos', label: 'Mis alumnos', icon: Users },
    { to: '/app/matricula', label: 'Matrícula', icon: BookOpenCheck },
    { to: '/app/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { to: '/app/horarios', label: 'Mi horario', icon: Clock },
    { to: '/app/cuadro-honor', label: 'Cuadro de honor', icon: Award },
    { to: '/app/fichas', label: 'Fichas', icon: ClipboardList },
    { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
  ],
  RESPONSABLE: [
    { to: '/app', label: 'Mis hijos', icon: Users },
    { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
  ],
  ALUMNO: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard }],
};

export function AppLayout() {
  const { usuario, bootDone } = useAuthStore();
  const navigate = useNavigate();
  const [movilAbierto, setMovilAbierto] = useState(false);

  if (!bootDone) return <Spinner className="min-h-screen" />;
  if (!usuario) return <Navigate to="/acceso" replace />;

  const items = menuPorRol[usuario.rol] ?? [];

  const salir = async () => {
    await logout();
    navigate('/acceso');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-line-subtle px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <Cross size={16} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-primary">Valdocco</p>
          <p className="text-[10px] uppercase tracking-widest text-secondary">CECMA</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={() => setMovilAbierto(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-[3px] border-accent bg-accent-soft text-accent'
                  : 'border-l-[3px] border-transparent text-secondary hover:bg-elevated hover:text-primary'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line-subtle p-3">
        <button
          onClick={salir}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-elevated hover:text-danger"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>
      {/* Drawer móvil */}
      {movilAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMovilAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-surface shadow-modal">{sidebar}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-base/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border border-line p-2 text-secondary lg:hidden"
              onClick={() => setMovilAbierto(true)}
              aria-label="Abrir menú"
            >
              {movilAbierto ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="text-sm font-semibold text-primary">Hola, {usuario.nombreCompleto.split(' ')[0]}</p>
              <p className="text-xs text-secondary">{usuario.rol.charAt(0) + usuario.rol.slice(1).toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NavLink
              to="/app/notificaciones"
              className="rounded-full border border-line bg-surface p-2 text-secondary transition-colors hover:text-primary"
              aria-label="Notificaciones"
            >
              <Bell size={16} />
            </NavLink>
            <ThemeToggle />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {usuario.nombreCompleto.charAt(0)}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
