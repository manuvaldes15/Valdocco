import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Cross, LockKeyhole } from 'lucide-react';
import { login, ApiError } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Button, Input } from '../../components/ui';

export function Acceso() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (usuario) return <Navigate to="/app" replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, contrasena);
      navigate('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
              <Cross size={22} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-primary">Acceso a Valdocco</h1>
            <p className="mt-1 text-sm text-secondary">Sistema de Seguimiento Académico del CECMA</p>
          </div>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="usuario@cecma.edu.sv"
              required
              autoComplete="username"
            />
            <Input
              label="Contraseña"
              type="password"
              value={contrasena}
              onChange={setContrasena}
              placeholder="••••••••••"
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={cargando} className="w-full">
              <LockKeyhole size={16} />
              {cargando ? 'Verificando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          El acceso es personal e intransferible. Si olvidó su contraseña, contacte a la dirección.
        </p>
      </div>
    </div>
  );
}
