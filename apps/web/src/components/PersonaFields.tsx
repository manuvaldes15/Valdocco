import { z } from 'zod';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field, SelectInput, TextInput } from './forms';

/** Schema y campos de persona compartidos por alumnos, maestros y responsables. */
export const personaZ = z.object({
  primerNombre: z.string().min(1, 'Requerido'),
  segundoNombre: z.string().optional(),
  primerApellido: z.string().min(1, 'Requerido'),
  segundoApellido: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(['M', 'F', 'OTRO']).or(z.literal('')).optional(),
  dui: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')).optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export type PersonaForm = z.infer<typeof personaZ>;

export function PersonaFields({
  register,
  errors,
  prefijo = 'persona',
}: {
  // El form padre anida los campos bajo `persona.*`
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  prefijo?: string;
}) {
  const err = (campo: string) => {
    const grupo = errors[prefijo] as Record<string, { message?: string }> | undefined;
    return grupo?.[campo]?.message;
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Primer nombre" error={err('primerNombre')}>
        <TextInput {...register(`${prefijo}.primerNombre`)} placeholder="Juan" />
      </Field>
      <Field label="Segundo nombre">
        <TextInput {...register(`${prefijo}.segundoNombre`)} placeholder="Carlos" />
      </Field>
      <Field label="Primer apellido" error={err('primerApellido')}>
        <TextInput {...register(`${prefijo}.primerApellido`)} placeholder="Pérez" />
      </Field>
      <Field label="Segundo apellido">
        <TextInput {...register(`${prefijo}.segundoApellido`)} placeholder="García" />
      </Field>
      <Field label="Fecha de nacimiento">
        <TextInput type="date" {...register(`${prefijo}.fechaNacimiento`)} />
      </Field>
      <Field label="Género">
        <SelectInput {...register(`${prefijo}.genero`)}>
          <option value="">Seleccionar…</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="OTRO">Otro</option>
        </SelectInput>
      </Field>
      <Field label="DUI">
        <TextInput {...register(`${prefijo}.dui`)} placeholder="00000000-0" />
      </Field>
      <Field label="Correo electrónico" error={err('email')}>
        <TextInput type="email" {...register(`${prefijo}.email`)} placeholder="correo@ejemplo.com" />
      </Field>
      <Field label="Teléfono">
        <TextInput {...register(`${prefijo}.telefono`)} placeholder="7000-0000" />
      </Field>
      <Field label="Dirección">
        <TextInput {...register(`${prefijo}.direccion`)} placeholder="Chalchuapa, Santa Ana" />
      </Field>
    </div>
  );
}
