import { useAuthStore } from '../store/auth';

/**
 * Cliente HTTP del frontend.
 * - El access token vive SOLO en memoria (store), nunca en localStorage.
 * - El refresh token vive en cookie httpOnly que maneja el navegador.
 * - Ante un 401 intenta refrescar una vez y reintenta la petición.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
  error?: { code: string; message: string };
}

async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body?.success) {
    throw new ApiError(res.status, body?.error?.code ?? 'ERROR', body?.error?.message ?? 'Error de red');
  }
  return body;
}

let refreshing: Promise<boolean> | null = null;

export async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const body = await rawRequest<{ accessToken: string; usuario: Usuario }>('/api/auth/refresh', {
        method: 'POST',
      });
      useAuthStore.getState().setSession(body.data.accessToken, body.data.usuario);
      return true;
    } catch {
      useAuthStore.getState().clear();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !path.startsWith('/api/auth/')) {
      const ok = await tryRefresh();
      if (ok) return rawRequest<T>(path, options);
    }
    throw e;
  }
}

export interface Usuario {
  id: string;
  nombreUsuario: string;
  email: string;
  rol: 'ADMIN' | 'DIRECTOR' | 'MAESTRO' | 'RESPONSABLE' | 'ALUMNO';
  personaId: string;
  nombreCompleto: string;
}

export async function login(email: string, contrasena: string): Promise<Usuario> {
  const body = await rawRequest<{ accessToken: string; usuario: Usuario }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, contrasena }),
  });
  useAuthStore.getState().setSession(body.data.accessToken, body.data.usuario);
  return body.data.usuario;
}

/** Descarga un archivo binario autenticado (PDF) y dispara el guardado en el navegador. */
export async function descargarArchivo(path: string, nombreArchivo: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(path, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'ERROR', body?.error?.message ?? 'No se pudo descargar');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export async function logout(): Promise<void> {
  await rawRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  useAuthStore.getState().clear();
}
