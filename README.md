# Valdocco — Sistema de Seguimiento Académico

Sistema de gestión académica del **Complejo Educativo Católico "María Auxiliadora"** (CECMA), Chalchuapa, Santa Ana, El Salvador. Proyecto de graduación. Arquitectura hexagonal por microservicios. Solo local por ahora, montado en Docker para facilitar el deploy futuro.

## Stack

- **Backend:** Node.js 22 · TypeScript 5 (strict) · Express 4 · Prisma 5 · Zod · PostgreSQL 16 · Redis 7
- **Frontend:** React 18 · Vite · Tailwind CSS · TanStack Query · Zustand · Recharts · Lucide
- **Infra:** Docker Compose · pnpm workspaces

## Arranque rápido (Docker)

```bash
# 1. Copiar variables de entorno y generar secretos propios
cp .env.example .env
# 2. Construir y levantar todo (crea tablas y siembra datos demo)
docker compose up -d --build
```

| URL | Qué es |
|---|---|
| http://localhost:3000 | Sitio público + aplicación (login en /acceso) |
| http://localhost:4000 | API Gateway (solo /api/*) |

### Credenciales demo (del seed)

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | admin@valdocco.local | Admin.Valdocco.2026 |
| DIRECTOR | direccion@cecma.edu.sv | Directora.CECMA.2026 |
| MAESTRO | maestro1@cecma.edu.sv | Maestro.CECMA.2026 |
| RESPONSABLE | padre1@correo.com | Padre.CECMA.2026 |

## Desarrollo local (sin Docker para los servicios)

```bash
pnpm install
pnpm prisma:generate
# Levantar solo postgres y redis en Docker:
docker compose up -d postgres redis
# Nota: en modo dev exponer puertos de BD editando docker-compose o usando
# un override local. Luego:
pnpm prisma:push && pnpm prisma:seed
pnpm dev   # levanta todos los servicios y el frontend en paralelo
```

## Arquitectura

```
web (nginx :3000) ──/api──▶ gateway (:4000, único punto público)
                              │  valida JWT, rate limit, inyecta
                              │  X-User-Id / X-User-Role / X-Person-Id
                              │  + X-Internal-Secret
      ┌───────────┬───────────┼───────────┬───────────┐
   auth:4001  personas:4002  academico:4003  ...  reportes:4009
      └───────────┴───────────┼───────────┴───────────┘
                       PostgreSQL 16 · Redis 7 (red interna)
```

Cada microservicio sigue **arquitectura hexagonal**:

```
src/
├── domain/           # entidades, interfaces de repositorio, lógica pura
├── application/      # casos de uso y DTOs
├── infrastructure/   # Prisma, Express, Redis, config (Zod)
└── index.ts          # composición raíz (inyección de dependencias)
```

## Seguridad implementada

- Access token JWT de 15 min **solo en memoria** del navegador; refresh token de 7 días en **cookie httpOnly SameSite=strict**, con hash SHA-256 en BD y **rotación en cada uso** (la reutilización invalida la sesión).
- Contraseñas con **bcrypt (12 rounds)**; política mínima de 10 caracteres con mayúsculas/minúsculas/números; mensajes de error genéricos en login.
- **Solo web y gateway** publican puertos (y solo en 127.0.0.1). Postgres, Redis y los 9 servicios viven en la red interna de Docker.
- Los servicios **rechazan cualquier request sin `X-Internal-Secret`** (defensa en profundidad: nadie puede saltarse el gateway).
- Rate limiting global + estricto en login (20 intentos / 15 min). Helmet, CORS restringido, headers de seguridad en nginx.
- Validación Zod en todos los bordes HTTP y en variables de entorno al arrancar.
- **Soft delete** (`fecha_elim`) en tablas de negocio y auditoría inmutable en `registros_auditoria` para notas, inscripciones, fichas y usuarios.
- Contenedores backend corren como usuario **no root**.

## Módulos del frontend

| Módulo | Ruta | Roles | Funciones |
|---|---|---|---|
| Dashboard | `/app` | todos | KPIs y gráficas según rol |
| Alumnos | `/app/alumnos` | gestión + maestro | listado, búsqueda, registro, detalle (ficha médica, responsables, historial) |
| Matrícula | `/app/matricula` | admin/director + maestro | inscribir, retirar (con motivo), cambio de sección/turno. El **maestro** matricula a sus alumnos y queda automáticamente como **maestro guía** |
| Calificaciones | `/app/calificaciones` | maestro + gestión | materia → periodo → actividades → tabla de calificación; control de peso ≤100%; el maestro solo gestiona **sus propias** materias |
| Estructura | `/app/estructura` | admin/director | árbol de niveles/grados/secciones, materias, asignación docente |
| Horarios / Mi horario | `/app/horarios` | gestión + maestro | gestión: vista semanal por sección + aulas. **Maestro:** arma su propio horario (solo sus asignaciones) en **cuadrícula horas × días** con espacios ocupados/libres; detección de conflictos de maestro y aula |
| Cuadro de honor | `/app/cuadro-honor` | maestro guía | el docente guía **previsualiza y publica** el cuadro de honor del periodo vigente de su sección (sin afectar otras secciones) |
| Comunidad | `/app/comunidad` | admin/director | maestros, responsables, vincular alumno, crear usuarios de acceso |
| Fichas | `/app/fichas` | maestro emite, gestión resuelve | emisión con notificación al responsable, resolución |
| Calendario | `/app/calendario` | todos (crear: gestión) | vista mensual con puntos por día y panel de detalle; catálogo de actividades recurrentes (ej. Hora Santa los jueves); eventos y anuncios |
| Portal padres | `/app` (rol RESPONSABLE) | responsable | **registra a sus hijos** (quedan vinculados a su cuenta), notas por materia, proyección, fichas con acuse de recibido, libreta PDF |

### Reportes y automatizaciones

- **Libreta de calificaciones PDF** (`GET /api/reportes/libreta/:alumnoId`): promedios por materia y periodo con la fórmula de aportes, generada con pdfkit. Descargable desde el detalle del alumno y el portal de padres (un responsable solo puede descargar la de sus hijos vinculados).
- **Cuadro de honor automático** (`POST /api/calendario/cuadro-honor/generar`): calcula el top N por grado del periodo vigente a partir de las notas y reemplaza las entradas del periodo. Botón "Generar" en el dashboard del director; alimenta la página pública.
- **Cuadro de honor por sección** (`/api/calendario/cuadro-honor/mis-secciones`, `GET .../seccion/:id`, `POST .../seccion/:id/publicar`): el **docente guía** previsualiza y publica el ranking de su propia sección; el reemplazo afecta solo a los alumnos de esa sección, sin pisar el de otras secciones del mismo periodo.
- **Actividades recurrentes** (`/api/calendario/recurrentes`): catálogo semanal (día + hora + color) que se proyecta automáticamente en el calendario mensual.

## Reglas de negocio clave (verificadas)

- `aporte = (nota_obtenida / nota_maxima) × porcentaje_peso`; proyección de aprobación por periodo.
- La suma de pesos de actividades por periodo no puede superar el 100% (`PESO_EXCEDIDO`).
- Una sola inscripción ACTIVA por alumno y año lectivo (`YA_INSCRITO`); respeto de capacidad de sección.
- Detección de conflictos de horario por maestro y aula (`CONFLICTO_HORARIO`, HTTP 409).
- Al crear una actividad se generan notas `PENDIENTE` para todos los alumnos inscritos.
- Ficha de atención → evento Redis → notificación persistida al responsable principal.
- **Pertenencia por rol** (cada servicio resuelve `personId`→`maestroId`/`responsableId` y compara): el maestro solo agenda/califica sus propias asignaciones (`NO_ES_SU_MATERIA`) y al matricular se asigna como guía; el responsable solo registra y consulta a sus propios hijos.

## Estructura del monorepo

```
valdocco/
├── apps/
│   ├── gateway/                # :4000 — JWT, proxy, rate limit
│   ├── auth-service/           # :4001 — login, refresh, logout
│   ├── personas-service/       # :4002 — personas, alumnos, maestros, responsables
│   ├── academico-service/      # :4003 — años, grados, secciones, materias
│   ├── inscripciones-service/  # :4004 — matrícula, retiros, cambios de turno
│   ├── calificaciones-service/ # :4005 — actividades, notas, promedios
│   ├── horarios-service/       # :4006 — aulas, horarios, conflictos
│   ├── calendario-service/     # :4007 — eventos, anuncios, fichas, cuadro de honor
│   ├── notificaciones-service/ # :4008 — consumer Redis + bandeja
│   ├── reportes-service/       # :4009 — KPIs y dashboards
│   └── web/                    # React + nginx
├── packages/
│   ├── shared-types/           # tipos, enums, DomainError
│   ├── prisma-client/          # schema único + seed
│   ├── http-kit/               # middlewares compartidos (internalAuth, errores, roles)
│   └── logger/                 # Winston
├── Dockerfile.backend          # imagen única para los 10 servicios
└── docker-compose.yml
```
