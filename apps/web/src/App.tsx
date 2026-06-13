import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { tryRefresh } from './lib/api';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { Inicio } from './pages/public/Inicio';
import { Historia } from './pages/public/Historia';
import { MisionVision } from './pages/public/MisionVision';
import { OfertaEducativa } from './pages/public/OfertaEducativa';
import { CuadroHonor } from './pages/public/CuadroHonor';
import { Contacto } from './pages/public/Contacto';
import { Acceso } from './pages/public/Acceso';
import { DashboardDirector } from './pages/app/DashboardDirector';
import { DashboardMaestro } from './pages/app/DashboardMaestro';
import { DashboardResponsable } from './pages/app/DashboardResponsable';
import { Alumnos } from './pages/app/Alumnos';
import { AlumnoDetalle } from './pages/app/AlumnoDetalle';
import { Matricula } from './pages/app/Matricula';
import { Calificaciones } from './pages/app/Calificaciones';
import { Estructura } from './pages/app/Estructura';
import { Horarios } from './pages/app/Horarios';
import { Comunidad } from './pages/app/Comunidad';
import { Fichas } from './pages/app/Fichas';
import { CuadroHonorSeccion } from './pages/app/CuadroHonorSeccion';
import { Calendario } from './pages/app/Calendario';
import { Notificaciones } from './pages/app/Notificaciones';
import { Toaster } from './components/toast';

function DashboardPorRol() {
  const { usuario } = useAuthStore();
  switch (usuario?.rol) {
    case 'MAESTRO':
      return <DashboardMaestro />;
    case 'RESPONSABLE':
      return <DashboardResponsable />;
    default:
      return <DashboardDirector />;
  }
}

export default function App() {
  const setBootDone = useAuthStore((s) => s.setBootDone);

  // Al cargar, intenta restaurar la sesión con la cookie httpOnly de refresh
  useEffect(() => {
    tryRefresh().finally(() => setBootDone());
  }, [setBootDone]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/historia" element={<Historia />} />
          <Route path="/mision-vision" element={<MisionVision />} />
          <Route path="/oferta-educativa" element={<OfertaEducativa />} />
          <Route path="/actividades" element={<Inicio />} />
          <Route path="/cuadro-honor" element={<CuadroHonor />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/acceso" element={<Acceso />} />
        </Route>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPorRol />} />
          <Route path="alumnos" element={<Alumnos />} />
          <Route path="alumnos/:id" element={<AlumnoDetalle />} />
          <Route path="matricula" element={<Matricula />} />
          <Route path="calificaciones" element={<Calificaciones />} />
          <Route path="estructura" element={<Estructura />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="comunidad" element={<Comunidad />} />
          <Route path="fichas" element={<Fichas />} />
          <Route path="cuadro-honor" element={<CuadroHonorSeccion />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="notificaciones" element={<Notificaciones />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
