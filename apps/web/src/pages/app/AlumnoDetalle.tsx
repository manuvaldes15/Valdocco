import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileDown, HeartPulse, Phone, Users } from 'lucide-react';
import { api, descargarArchivo, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { toast } from '../../components/toast';
import { formatearFecha, nombreCompleto } from '../../lib/format';

interface AlumnoCompleto {
  id: string;
  codigoAlumno: string | null;
  tipoSangre: string | null;
  alergias: string | null;
  condicionesMedicas: string | null;
  nombreContactoEmergencia: string | null;
  telefonoContactoEmergencia: string | null;
  persona: {
    primerNombre: string;
    segundoNombre: string | null;
    primerApellido: string;
    segundoApellido: string | null;
    fechaNacimiento: string | null;
    genero: string | null;
    direccion: string | null;
    telefono: string | null;
  };
  responsables: {
    id: string;
    esPrincipal: boolean;
    responsable: { tipoRelacion: string | null; persona: { primerNombre: string; primerApellido: string; telefono: string | null; email: string | null } };
  }[];
  inscripciones: {
    id: string;
    estado: string;
    fechaInscripcion: string;
    seccion: { nombre: string; turno: string; grado: { nombre: string } };
    anioLectivo: { nombre: string };
  }[];
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{etiqueta}</p>
      <p className="mt-0.5 text-sm text-primary">{valor || '—'}</p>
    </div>
  );
}

export function AlumnoDetalle() {
  const { id } = useParams<{ id: string }>();
  const [descargando, setDescargando] = useState(false);
  const { data: a, isLoading } = useQuery({
    queryKey: ['alumno', id],
    enabled: Boolean(id),
    queryFn: async () => (await api<AlumnoCompleto>(`/api/personas/alumnos/${id}`)).data,
  });

  if (isLoading || !a) return <Spinner />;

  const descargarLibreta = async () => {
    setDescargando(true);
    try {
      await descargarArchivo(`/api/reportes/libreta/${a.id}`, `libreta-${a.codigoAlumno ?? a.id}.pdf`);
      toast.ok('Libreta descargada');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo generar la libreta');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            to="/app/alumnos"
            className="rounded-md border border-line p-2 text-secondary transition-colors hover:bg-elevated hover:text-primary"
            aria-label="Volver"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">{nombreCompleto(a.persona)}</h1>
            <p className="font-mono text-sm text-secondary">{a.codigoAlumno ?? 'Sin código'}</p>
          </div>
        </div>
        <Button onClick={descargarLibreta} disabled={descargando}>
          <FileDown size={16} /> {descargando ? 'Generando…' : 'Descargar libreta PDF'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Datos personales" />
          <div className="grid grid-cols-2 gap-4 px-5 pb-5">
            <Dato etiqueta="Fecha de nacimiento" valor={a.persona.fechaNacimiento ? formatearFecha(a.persona.fechaNacimiento) : null} />
            <Dato etiqueta="Género" valor={a.persona.genero === 'M' ? 'Masculino' : a.persona.genero === 'F' ? 'Femenino' : a.persona.genero} />
            <Dato etiqueta="Teléfono" valor={a.persona.telefono} />
            <div className="col-span-2">
              <Dato etiqueta="Dirección" valor={a.persona.direccion} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ficha médica" action={<HeartPulse size={16} className="text-danger" />} />
          <div className="grid grid-cols-2 gap-4 px-5 pb-5">
            <Dato etiqueta="Tipo de sangre" valor={a.tipoSangre} />
            <Dato etiqueta="Alergias" valor={a.alergias} />
            <div className="col-span-2">
              <Dato etiqueta="Condiciones médicas" valor={a.condicionesMedicas} />
            </div>
            <Dato etiqueta="Contacto de emergencia" valor={a.nombreContactoEmergencia} />
            <Dato etiqueta="Tel. emergencia" valor={a.telefonoContactoEmergencia} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Responsables" action={<Users size={16} className="text-secondary" />} />
          <div className="space-y-3 px-5 pb-5">
            {a.responsables.length === 0 && <EmptyState mensaje="Sin responsables vinculados" />}
            {a.responsables.map((r) => (
              <div key={r.id} className="rounded-lg bg-elevated p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-primary">
                    {r.responsable.persona.primerNombre} {r.responsable.persona.primerApellido}
                  </p>
                  {r.esPrincipal && <Badge tone="accent">Principal</Badge>}
                </div>
                <p className="mt-1 text-xs text-secondary">{r.responsable.tipoRelacion ?? 'Responsable'}</p>
                {r.responsable.persona.telefono && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
                    <Phone size={11} /> {r.responsable.persona.telefono}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Historial de inscripciones" />
        <div className="px-5 pb-5">
          {a.inscripciones.length === 0 ? (
            <EmptyState mensaje="El alumno no tiene inscripciones. Matricúlelo desde el módulo de Matrícula." />
          ) : (
            <Table headers={['Año lectivo', 'Grado y sección', 'Turno', 'Fecha de inscripción', 'Estado']}>
              {a.inscripciones.map((i) => (
                <tr key={i.id} className="odd:bg-surface even:bg-elevated/50">
                  <td className="px-4 py-3 font-mono text-sm text-primary">{i.anioLectivo.nombre}</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {i.seccion.grado.nombre} "{i.seccion.nombre}"
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={i.seccion.turno === 'MANANA' ? 'accent' : 'warning'}>
                      {i.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-secondary">{formatearFecha(i.fechaInscripcion)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={i.estado === 'ACTIVO' ? 'success' : i.estado === 'RETIRADO' ? 'danger' : 'neutral'}>
                      {i.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
