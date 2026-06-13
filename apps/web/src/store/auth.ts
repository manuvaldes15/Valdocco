import { create } from 'zustand';
import type { Usuario } from '../lib/api';

interface AuthState {
  accessToken: string | null;
  usuario: Usuario | null;
  bootDone: boolean;
  setSession: (token: string, usuario: Usuario) => void;
  setBootDone: () => void;
  clear: () => void;
}

/**
 * El token de acceso vive solo en memoria por seguridad (XSS no puede
 * robar lo que no está en localStorage). La sesión se restaura al
 * recargar mediante la cookie httpOnly de refresh.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  usuario: null,
  bootDone: false,
  setSession: (accessToken, usuario) => set({ accessToken, usuario, bootDone: true }),
  setBootDone: () => set({ bootDone: true }),
  clear: () => set({ accessToken: null, usuario: null, bootDone: true }),
}));
