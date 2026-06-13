import { DomainError } from '@valdocco/shared-types';

/** Regla de negocio: política mínima de contraseñas del CECMA. */
export function validarPoliticaContrasena(contrasena: string): void {
  if (contrasena.length < 10) {
    throw new DomainError('La contraseña debe tener al menos 10 caracteres', 400, 'CONTRASENA_DEBIL');
  }
  if (!/[A-Z]/.test(contrasena) || !/[a-z]/.test(contrasena) || !/[0-9]/.test(contrasena)) {
    throw new DomainError(
      'La contraseña debe incluir mayúsculas, minúsculas y números',
      400,
      'CONTRASENA_DEBIL'
    );
  }
}
