# CLAUDE.md — EduTrack: Sistema de Seguimiento Académico
# Complejo Educativo Católico "María Auxiliadora" — Chalchuapa, Santa Ana, El Salvador
> Archivo de contexto principal. Leer completo al inicio de cada sesión de desarrollo.
> Versión 3.0 — Institución única, sin multitenancy, arquitectura hexagonal por microservicios.

---

## 1. IDENTIDAD DE LA INSTITUCIÓN

**Nombre oficial:** Complejo Educativo Católico "María Auxiliadora"
**Abreviatura:** CECMA
**Lema:** "Formando Buenos Cristianos y Honrados Ciudadanos"
**Tipo:** Institución Católica Salesiana
**Administración:** Religiosas "Hijas del Divino Salvador" (HDS)
**Directora actual:** Hna. Jesús Amelia Alvarado
**Comunicaciones:** María Magdalena Méndez — Tel: 7930-2740 — mendezhds81@yahoo.es
**Teléfono institucional:** 2444-0215 — hdsamelia24@hotmail.com
**Dirección:** Final 10a. Avenida Sur y Calle hacia el Cantón El Arado, Barrio San Sebastián, Chalchuapa, Santa Ana, El Salvador
**Coordenadas:** X8J8+5M7, 10a Av Sur, Chalchuapa
**Facebook:** https://www.facebook.com/salesmariauxiliadora/

### Comunidad educativa actual
- 10 religiosas HDS
- 32 docentes
- 809 alumnos
- 10 miembros de personal administrativo y de servicio
- Familias, ex alumnos y bienhechores

### Misión
"Somos una Institución Católica Salesiana, administrada por religiosas Hijas del Divino Salvador, que formamos integralmente a niños y jóvenes para hacer frente a los retos actuales de la educación, mediante la razón, la religión y el amor."

### Visión
"Formar Buenos Cristianos y Honrados Ciudadanos y profesionales competentes; capaces de transformar su entorno social a través de su integridad moral y cristiana."

### Valores institucionales
Amor, servicio, paz, responsabilidad, honradez, respeto, gratitud, alegría, perseverancia, fe, integridad y comunicación.

### Historia resumida (para páginas públicas)
- **1912:** Llegada de las Hijas de María Auxiliadora a Chalchuapa, invitadas por Don Salvador Morán. La obra inicia como "Hospicio Santa Rosa".
- **1924:** Se inscribe oficialmente como Colegio María Auxiliadora.
- **1976:** La presencia salesiana había formado dieciocho Hijas de María Auxiliadora y otras vocaciones religiosas.
- **16 de febrero de 1980:** Fundación del Complejo Educativo bajo su nombre actual. Fundador: Mons. Pedro Arnoldo Aparicio Quintanilla. Primera directora: Hna. María Zoila Acosta. Primeras maestras: Hna. Sonia Eureistele Pérez y Hna. Juana Antonia Rivas. Comenzó con 80 alumnos en parvularia, primero, segundo y tercer grado.
- **1980:** La obra fue entregada en comodato a las Hijas del Divino Salvador.
- **Finales de 1990:** Traslado al local actual.
- **29 de junio de 1991:** Reinauguración del local actual.
- **Año 2000:** Inicio del Bachillerato General.
- **2001:** Egreso de la primera promoción de bachilleres.
- **Hoy:** 809 alumnos, presencia sólida en la comunidad de Chalchuapa y sus alrededores.

### Actividades institucionales públicas (páginas sin login)
- Cuadro de Honor por periodo
- Consulta de notas por NIE (Bachillerato)
- Noticias y actividades del año lectivo
- Celebración de la fiesta de María Auxiliadora (24 de mayo)
- Oratorio Festivo y actividades extracurriculares
- Actos de graduación (Parvularia 6 años, 9no Grado, 2do Bachillerato)
- Actividades deportivas y culturales
- Semana Santa y celebraciones litúrgicas

---

## 2. QUÉ ES ESTE PROYECTO

**EduTrack** es un sistema de gestión y seguimiento académico desarrollado exclusivamente para el CECMA. Es el proyecto de graduación de dos estudiantes desarrollado en 4 meses. No es multitenancy: una sola institución, una sola base de datos.

- **Desarrollador principal:** Manuel (experiencia en Java EE, EJB, JPA, JSF/ICEfaces, nociones de Docker y REST)
- **Equipo:** 2 personas
- **Duración:** 16 semanas
- **Entorno:** Local únicamente durante el desarrollo. Sin deploy en la nube por ahora.

### Roles del sistema
| Rol | Descripción |
|---|---|
| `ADMIN` | Nosotros como desarrolladores. Acceso total. |
| `DIRECTOR` | Director(a) de la institución. Gestión completa de la escuela. |
| `MAESTRO` | Docentes. Sus grados, materias, notas, fichas, horarios. |
| `RESPONSABLE` | Padres/tutores. Portal para ver notas y datos de sus hijos. |
| `ALUMNO` | Acceso futuro/opcional a sus propias notas. |

---

## 3. ARQUITECTURA: HEXAGONAL POR MICROSERVICIOS

### Por qué arquitectura hexagonal
La arquitectura hexagonal (Ports & Adapters) separa la lógica de negocio pura del mundo exterior (HTTP, base de datos, notificaciones). Esto permite:
- Cambiar el ORM, el framework o la BD sin tocar la lógica de negocio.
- Testear la lógica de negocio sin levantar servidores ni bases de datos.
- Código más limpio, predecible y mantenible.
- Aprender un patrón de arquitectura usado en sistemas empresariales reales.

### Estructura interna de cada microservicio (Hexagonal)
```
src/
├── domain/                  # NUCLEO — sin dependencias externas
│   ├── entities/            # Entidades del dominio (clases puras, sin decoradores ORM)
│   ├── value-objects/       # Objetos de valor (NIE, Nota, Porcentaje...)
│   ├── repositories/        # INTERFACES (puertos de salida) — solo contratos
│   ├── services/            # Lógica de negocio pura — usa las interfaces
│   └── errors/              # Errores de dominio tipados
│
├── application/             # CASOS DE USO — orquesta el dominio
│   ├── use-cases/           # Un archivo por caso de uso (CreateActivity, GradeStudent...)
│   └── dtos/                # Data Transfer Objects de entrada y salida
│
├── infrastructure/          # ADAPTADORES — implementaciones concretas
│   ├── persistence/         # Repositorios Prisma (implementan las interfaces del dominio)
│   ├── http/                # Controllers Express, routes, middlewares
│   ├── messaging/           # Redis pub/sub publishers y consumers
│   └── external/            # FCM, Nodemailer, S3/MinIO
│
└── index.ts                 # Composición raíz — inyecta dependencias y levanta el servidor
```

### Mapa de microservicios
```
  FRONTEND React (puerto 3000)
         |
  API GATEWAY (puerto 4000)
  — Valida JWT
  — Enruta al servicio correcto
  — Inyecta headers internos: X-User-Id, X-User-Role, X-Person-Id
         |
  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
  │ AUTH │PERSO-│ACADE-│INSCR.│GRADE-│SCHED-│CALEN-│NOTIF.│
  │:4001 │NAS   │MICO  │:4004 │:4005 │:4006 │:4007 │:4008 │
  │      │:4002 │:4003 │      │      │      │      │      │
  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
         |
  PostgreSQL 16 (puerto 5432)
  Redis 7       (puerto 6379)
```

### Lista de servicios
| Servicio | Puerto | Responsabilidad |
|---|---|---|
| `gateway` | 4000 | Entrada única, JWT, enrutamiento, rate limit |
| `auth-service` | 4001 | Login, logout, refresh tokens, contraseñas |
| `personas-service` | 4002 | Personas, usuarios, alumnos, maestros, responsables |
| `academico-service` | 4003 | Configuración, niveles, grados, secciones, materias |
| `inscripciones-service` | 4004 | Matrículas, cambios de turno, retiros |
| `calificaciones-service` | 4005 | Actividades, notas, promedios, periodos |
| `horarios-service` | 4006 | Horarios laborales, horarios de clases, aulas, conflictos |
| `calendario-service` | 4007 | Eventos, anuncios, fichas de atención, cuadro de honor |
| `notificaciones-service` | 4008 | Push FCM, email, Redis consumer |
| `reportes-service` | 4009 | PDFs libretas, rankings, KPIs, dashboards |

### Comunicación entre servicios
- **Síncrona:** El gateway llama a los servicios. Los servicios raramente se llaman entre sí.
- **Asíncrona:** Redis Pub/Sub para eventos sin respuesta inmediata. Ejemplo: ficha creada → `notifications` channel → padre notificado.
- **Regla:** Un servicio no importa código de otro. Si necesita datos externos, hace HTTP interno o consume un evento de Redis.

---

## 4. STACK TECNOLÓGICO

### Backend (cada microservicio)
- **Runtime:** Node.js 20 LTS
- **Lenguaje:** TypeScript 5 — `strict: true` en todos los tsconfig
- **Framework HTTP:** Express 4
- **ORM:** Prisma 5
- **Validación entrada:** Zod (schemas en capa infrastructure/http)
- **Tests:** Vitest + Supertest
- **Linter/Formato:** ESLint + Prettier

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **UI base:** Tailwind CSS + shadcn/ui
- **Estado global:** Zustand
- **Fetching/Cache:** TanStack Query v5
- **Formularios:** React Hook Form + Zod
- **Tablas:** TanStack Table v8
- **Gráficas:** Recharts
- **Iconos:** Lucide React — NO usar emojis
- **Calendarios:** FullCalendar (react wrapper)
- **PDF viewer:** react-pdf

### Infraestructura
- **Base de datos:** PostgreSQL 16
- **Cache / Mensajería:** Redis 7
- **Contenedores:** Docker + Docker Compose
- **Storage archivos:** MinIO (compatible S3 — logos, fotos, documentos)
- **CI/CD:** No requerido en fase local

### Estructura del monorepo
```
edutrack/
├── apps/
│   ├── gateway/
│   ├── auth-service/
│   ├── personas-service/
│   ├── academico-service/
│   ├── inscripciones-service/
│   ├── calificaciones-service/
│   ├── horarios-service/
│   ├── calendario-service/
│   ├── notificaciones-service/
│   ├── reportes-service/
│   └── web/                    # React frontend
├── packages/
│   ├── shared-types/           # Interfaces, enums, DTOs compartidos
│   ├── prisma-client/          # Schema Prisma único + cliente generado
│   └── logger/                 # Winston compartido
├── docker-compose.yml
└── CLAUDE.md
```

---

## 5. BASE DE DATOS — SCHEMA COMPLETO

### Estrategia
- Una base de datos PostgreSQL, sin multitenancy.
- Soft delete en todas las tablas de negocio: `fecha_elim` en lugar de DELETE físico.
- Todos los queries deben filtrar `WHERE fecha_elim IS NULL`.
- Auditoría en campos de cada tabla + tabla central `registros_auditoria`.

### Campos de auditoría estándar (TODAS las tablas)
```sql
fecha_crea    TIMESTAMPTZ NOT NULL DEFAULT NOW()
fecha_mod     TIMESTAMPTZ NOT NULL DEFAULT NOW()
fecha_elim    TIMESTAMPTZ                          -- NULL = activo
user_crea     UUID REFERENCES personas(id)
user_mod      UUID REFERENCES personas(id)
user_elim     UUID REFERENCES personas(id)
```
La tabla `configuracion` y catálogos simples (niveles, ciclos) usan solo `fecha_crea`, `fecha_mod`, `user_crea`, `user_mod`.

### Todas las tablas y campos

```sql
-- ─────────────────────────────────────────────
-- BLOQUE 1: CONFIGURACIÓN
-- ─────────────────────────────────────────────

Table configuracion {
  id                            INT PK AUTOINCREMENT  -- fila única (id=1)
  nombre_institucion            VARCHAR(200) NOT NULL  -- "Complejo Educativo Católico María Auxiliadora"
  direccion                     TEXT                   -- "Final 10a. Av. Sur..."
  telefono                      VARCHAR(20)            -- "2444-0215"
  email                         VARCHAR(200)           -- "hdsamelia24@hotmail.com"
  logo_url                      TEXT                   -- URL en MinIO
  turno_manana                  BOOLEAN DEFAULT TRUE
  turno_tarde                   BOOLEAN DEFAULT FALSE
  fecha_crea / fecha_mod / user_crea / user_mod
}

-- ─────────────────────────────────────────────
-- BLOQUE 2: PERSONAS Y USUARIOS
-- ─────────────────────────────────────────────

Table personas {
  id UUID PK
  primer_nombre     VARCHAR(100) NOT NULL
  segundo_nombre    VARCHAR(100)
  primer_apellido   VARCHAR(100) NOT NULL
  segundo_apellido  VARCHAR(100)
  fecha_nacimiento  DATE
  genero            VARCHAR(10)           -- 'M' | 'F' | 'OTRO'
  dui               VARCHAR(20)
  email             VARCHAR(200)
  telefono          VARCHAR(20)
  telefono_alt      VARCHAR(20)
  direccion         TEXT
  profesion         VARCHAR(200)
  foto_url          TEXT
  nacionalidad      VARCHAR(100)
  [auditoría completa]
}

Table usuarios {
  id UUID PK
  persona_id        UUID FK → personas.id NOT NULL UNIQUE
  nombre_usuario    VARCHAR(100) UNIQUE NOT NULL
  email             VARCHAR(200) UNIQUE NOT NULL
  contrasena_hash   TEXT NOT NULL
  rol               VARCHAR(20) NOT NULL  -- 'ADMIN' | 'DIRECTOR' | 'MAESTRO' | 'RESPONSABLE' | 'ALUMNO'
  activo            BOOLEAN DEFAULT TRUE
  ultimo_acceso     TIMESTAMPTZ
  refresh_token_hash TEXT
  [auditoría completa]
}

Table alumnos {
  id UUID PK
  persona_id                   UUID FK → personas.id NOT NULL UNIQUE
  codigo_alumno                VARCHAR(30) UNIQUE
  tipo_sangre                  VARCHAR(5)
  alergias                     TEXT
  condiciones_medicas          TEXT
  necesidades_especiales       TEXT
  nombre_contacto_emergencia   VARCHAR(200)
  telefono_contacto_emergencia VARCHAR(20)
  [auditoría completa]
}

Table responsables {
  id UUID PK
  persona_id      UUID FK → personas.id NOT NULL UNIQUE
  tipo_relacion   VARCHAR(20)   -- 'PADRE' | 'MADRE' | 'TUTOR' | 'OTRO'
  [auditoría completa]
}

Table alumno_responsables {
  id UUID PK
  alumno_id      UUID FK → alumnos.id NOT NULL
  responsable_id UUID FK → responsables.id NOT NULL
  es_principal   BOOLEAN DEFAULT FALSE  -- recibe notificaciones por defecto
  puede_recoger  BOOLEAN DEFAULT TRUE
  [auditoría completa]
  UNIQUE(alumno_id, responsable_id)
}

Table maestros {
  id UUID PK
  persona_id          UUID FK → personas.id NOT NULL UNIQUE
  codigo_maestro      VARCHAR(30)
  especializacion     VARCHAR(200)
  fecha_contratacion  DATE
  tipo_contrato       VARCHAR(20)  -- 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'CONTRATO'
  [auditoría completa]
}

-- ─────────────────────────────────────────────
-- BLOQUE 3: ESTRUCTURA ACADÉMICA
-- ─────────────────────────────────────────────

Table anios_lectivos {
  id UUID PK
  nombre       VARCHAR(20) NOT NULL   -- '2026'
  fecha_inicio DATE NOT NULL
  fecha_fin    DATE NOT NULL
  activo       BOOLEAN DEFAULT FALSE  -- solo uno activo a la vez
  [auditoría completa]
}

Table niveles_academicos {
  id UUID PK
  nombre VARCHAR(100) NOT NULL  -- 'Parvularia' | 'Primaria' | 'Secundaria' | 'Bachillerato'
  orden  INT NOT NULL
  fecha_crea / fecha_mod / user_crea / user_mod
}

Table ciclos {
  id UUID PK
  nivel_id UUID FK → niveles_academicos.id NOT NULL
  nombre   VARCHAR(100) NOT NULL  -- 'Primer Ciclo' | 'Segundo Ciclo' | 'Tercer Ciclo' | 'Bachillerato'
  orden    INT NOT NULL
  fecha_crea / fecha_mod / user_crea / user_mod
}

Table grados {
  id UUID PK
  ciclo_id           UUID FK → ciclos.id NOT NULL
  nombre             VARCHAR(100) NOT NULL       -- '1er Grado', '9no Grado', '2do Bachillerato'
  orden              INT NOT NULL
  sistema_evaluacion VARCHAR(15) NOT NULL        -- 'TRIMESTRAL' (1°–6°) | 'PERIODOS' (7°–2°Bach)
  fecha_crea / fecha_mod / user_crea / user_mod
  -- TRIMESTRAL = 3 cortes/año | PERIODOS = 4 cortes/año
}

Table secciones {
  id UUID PK
  grado_id               UUID FK → grados.id NOT NULL
  nombre                 VARCHAR(10) NOT NULL   -- 'A' | 'B' | 'C'
  turno                  VARCHAR(10) NOT NULL   -- 'MANANA' | 'TARDE'
  nota_minima_aprobacion DECIMAL(4,2) DEFAULT 5.0
  capacidad              INT DEFAULT 35
  [auditoría completa]
}

Table materias {
  id UUID PK
  nombre      VARCHAR(200) NOT NULL
  codigo      VARCHAR(20)           -- 'MAT', 'ESP', 'CN', 'SS'
  color_hex   VARCHAR(7)            -- para UI y calendario
  descripcion TEXT
  [auditoría completa]
}

Table seccion_materias {
  id UUID PK
  seccion_id      UUID FK → secciones.id NOT NULL
  materia_id      UUID FK → materias.id NOT NULL
  maestro_id      UUID FK → maestros.id NOT NULL
  anio_lectivo_id UUID FK → anios_lectivos.id NOT NULL
  horas_semanales DECIMAL(4,1)
  [auditoría completa]
  UNIQUE(seccion_id, materia_id, anio_lectivo_id)
  -- Un especialista puede dar la misma materia a múltiples secciones
}

-- ─────────────────────────────────────────────
-- BLOQUE 4: INSCRIPCIONES
-- ─────────────────────────────────────────────

Table inscripciones {
  id UUID PK
  alumno_id         UUID FK → alumnos.id NOT NULL
  seccion_id        UUID FK → secciones.id NOT NULL
  anio_lectivo_id   UUID FK → anios_lectivos.id NOT NULL
  maestro_guia_id   UUID FK → maestros.id NOT NULL
  fecha_inscripcion DATE NOT NULL
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'  -- 'ACTIVO'|'RETIRADO'|'TRASLADADO'|'GRADUADO'
  -- Retiro
  fecha_retiro  DATE
  motivo_retiro TEXT
  -- Cambio de turno
  turno_traslado VARCHAR(10)   -- 'MANANA' | 'TARDE'
  fecha_traslado DATE
  [auditoría completa]
  UNIQUE(alumno_id, anio_lectivo_id) WHERE estado = 'ACTIVO'
}

-- ─────────────────────────────────────────────
-- BLOQUE 5: HORARIOS Y AULAS
-- ─────────────────────────────────────────────

Table aulas {
  id UUID PK
  nombre          VARCHAR(50) NOT NULL
  capacidad       INT
  edificio        VARCHAR(100)
  turno_manana    BOOLEAN DEFAULT TRUE
  turno_tarde     BOOLEAN DEFAULT FALSE
  [auditoría completa]
}

Table horarios_laborales {
  id UUID PK
  maestro_id      UUID FK → maestros.id NOT NULL
  anio_lectivo_id UUID FK → anios_lectivos.id NOT NULL
  dia_semana      INT NOT NULL   -- 1=Lunes ... 5=Viernes
  hora_entrada    TIME NOT NULL
  hora_salida     TIME NOT NULL
  turno           VARCHAR(10)    -- 'MANANA' | 'TARDE'
  [auditoría completa]
}

Table horarios_clases {
  id UUID PK
  maestro_id         UUID FK → maestros.id NOT NULL
  seccion_materia_id UUID FK → seccion_materias.id NOT NULL
  aula_id            UUID FK → aulas.id NOT NULL
  anio_lectivo_id    UUID FK → anios_lectivos.id NOT NULL
  dia_semana         INT NOT NULL   -- 1=Lunes ... 5=Viernes
  hora_inicio        TIME NOT NULL
  hora_fin           TIME NOT NULL
  [auditoría completa]
  -- REGLA CRÍTICA: verificar solapamiento de maestro Y aula antes de insertar
  -- WHERE dia_semana=$1 AND (maestro_id=$2 OR aula_id=$3)
  -- AND NOT (hora_fin <= $4 OR hora_inicio >= $5) AND fecha_elim IS NULL
}

-- ─────────────────────────────────────────────
-- BLOQUE 6: EVALUACIONES Y CALIFICACIONES
-- ─────────────────────────────────────────────

Table periodos_evaluacion {
  id UUID PK
  anio_lectivo_id  UUID FK → anios_lectivos.id NOT NULL
  grado_id         UUID FK → grados.id NOT NULL
  nombre           VARCHAR(100) NOT NULL   -- '1er Trimestre' | '2do Periodo'
  numero_periodo   INT NOT NULL             -- 1, 2, 3 o 1, 2, 3, 4
  fecha_inicio     DATE NOT NULL
  fecha_fin        DATE NOT NULL
  [auditoría completa]
  UNIQUE(anio_lectivo_id, grado_id, numero_periodo)
}

Table actividades {
  id UUID PK
  seccion_materia_id    UUID FK → seccion_materias.id NOT NULL
  periodo_evaluacion_id UUID FK → periodos_evaluacion.id NOT NULL
  titulo                VARCHAR(200) NOT NULL
  descripcion           TEXT
  tipo                  VARCHAR(20) NOT NULL  -- 'EXAMEN'|'TAREA'|'PROYECTO'|'QUIZ'|'PARTICIPACION'|'OTRO'
  porcentaje_peso       DECIMAL(5,2) NOT NULL -- suma por periodo no puede superar 100
  nota_maxima           DECIMAL(5,2) NOT NULL DEFAULT 10
  fecha_entrega         DATE
  es_general            BOOLEAN DEFAULT FALSE
  grado_destino_id      UUID FK → grados.id   -- NULL = solo esta sección
  [auditoría completa]
  -- FÓRMULA: aporte = (nota_obtenida / nota_maxima) * porcentaje_peso
  -- EJEMPLO: Julio saca 8/10 en actividad de 20% → aporte = (8/10) * 20 = 1.6 pts
}

Table notas_actividades {
  id UUID PK
  actividad_id  UUID FK → actividades.id NOT NULL
  alumno_id     UUID FK → alumnos.id NOT NULL
  nota_obtenida DECIMAL(5,2)          -- NULL = pendiente
  estado        VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'  -- 'PENDIENTE'|'ENTREGADO'|'CALIFICADO'|'EXIMIDO'
  fecha_entrega TIMESTAMPTZ
  comentario    TEXT
  [auditoría completa]
  UNIQUE(actividad_id, alumno_id)
}

-- ─────────────────────────────────────────────
-- BLOQUE 7: FICHAS DE ATENCIÓN
-- ─────────────────────────────────────────────

Table fichas_atencion {
  id UUID PK
  alumno_id           UUID FK → alumnos.id NOT NULL
  maestro_id          UUID FK → maestros.id NOT NULL
  titulo              VARCHAR(200) NOT NULL
  descripcion         TEXT NOT NULL
  gravedad            VARCHAR(10) NOT NULL   -- 'BAJA'|'MEDIA'|'ALTA'|'CRITICA'
  fecha_emision       DATE NOT NULL
  notificado_en       TIMESTAMPTZ
  acuse_responsable_en TIMESTAMPTZ
  estado              VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'  -- 'ABIERTA'|'ACUSADA'|'RESUELTA'|'ARCHIVADA'
  [auditoría completa]
}

-- ─────────────────────────────────────────────
-- BLOQUE 8: CALENDARIO Y ANUNCIOS
-- ─────────────────────────────────────────────

Table eventos_calendario {
  id UUID PK
  titulo            VARCHAR(200) NOT NULL
  descripcion       TEXT
  fecha_inicio      DATE NOT NULL
  fecha_fin         DATE NOT NULL
  hora_inicio       TIME
  hora_fin          TIME
  tipo_evento       VARCHAR(20)   -- 'ACADEMICO'|'INSTITUCIONAL'|'FERIADO'|'EVALUACION'
  publico_destino   VARCHAR(20)   -- 'TODOS'|'MAESTROS'|'ALUMNOS'|'PADRES'
  grado_destino_id  UUID FK → grados.id   -- NULL = toda la institución
  creado_por_id     UUID FK → usuarios.id
  [auditoría completa]
}

Table anuncios {
  id UUID PK
  titulo           VARCHAR(200) NOT NULL
  contenido        TEXT NOT NULL
  autor_id         UUID FK → usuarios.id NOT NULL
  publico_destino  VARCHAR(20)   -- 'TODOS'|'MAESTROS'|'ALUMNOS'|'PADRES'
  grado_destino_id UUID FK → grados.id
  es_destacado     BOOLEAN DEFAULT FALSE
  publicado_en     TIMESTAMPTZ
  expira_en        TIMESTAMPTZ
  [auditoría completa]
}

-- ─────────────────────────────────────────────
-- BLOQUE 9: CUADRO DE HONOR Y PROMOCIONES
-- ─────────────────────────────────────────────

Table cuadro_honor {
  id UUID PK
  anio_lectivo_id       UUID FK → anios_lectivos.id NOT NULL
  periodo_evaluacion_id UUID FK → periodos_evaluacion.id NOT NULL
  alumno_id             UUID FK → alumnos.id NOT NULL
  posicion              INT NOT NULL
  promedio_general      DECIMAL(5,2) NOT NULL
  otorgado_en           TIMESTAMPTZ DEFAULT NOW()
  fecha_crea / fecha_mod / user_crea / user_mod
}

Table promociones {
  id UUID PK
  anio_lectivo_id UUID FK → anios_lectivos.id NOT NULL
  alumno_id       UUID FK → alumnos.id NOT NULL
  grado_id        UUID FK → grados.id NOT NULL
  fecha_ceremonia DATE
  notas           TEXT
  -- Hitos: Parvularia 6 años, 9no Grado, 2do Bachillerato
  fecha_crea / fecha_mod / user_crea / user_mod
}

-- ─────────────────────────────────────────────
-- BLOQUE 10: AUDITORÍA CENTRAL
-- ─────────────────────────────────────────────

Table registros_auditoria {
  id UUID PK
  usuario_id         UUID NOT NULL
  nombre_tabla       VARCHAR(100) NOT NULL
  id_registro        UUID NOT NULL
  accion             VARCHAR(10) NOT NULL  -- 'INSERT'|'UPDATE'|'DELETE'
  valores_anteriores JSONB
  valores_nuevos     JSONB
  fecha_crea         TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Solo INSERT. Nunca UPDATE ni DELETE. Inmutable.
}
```

---

## 6. DISEÑO VISUAL — SISTEMA DE TOKENS

### Filosofía de diseño
Inspirado en los dashboards de referencia proporcionados (CRM dark panel + Toko Platform):
- Fondo oscuro profundo con tarjetas ligeramente elevadas
- Tipografía limpia sin serif para datos, con jerarquía clara
- Acentos de color únicos y controlados (no degradados exagerados)
- Tablas densas con filas alternadas sutiles
- KPIs con números grandes y etiquetas pequeñas
- Gráficas integradas al layout, no flotantes
- Modo claro y modo oscuro con cambio instantáneo
- Iconos Lucide React — NUNCA emojis
- Sin degradados exagerados
- Colores minimalistas con paleta reducida

### Archivo de tokens de diseño: `apps/web/src/styles/tokens.css`
```css
/* ============================================================
   EDUTRACK — TOKENS DE DISEÑO CECMA
   Editar aquí para cambiar toda la apariencia del sistema
   ============================================================ */

:root {
  /* ── PALETA BASE (modo oscuro por defecto) ── */
  --color-bg-base:        #0f1117;   /* fondo principal */
  --color-bg-surface:     #1a1d27;   /* tarjetas, sidebar */
  --color-bg-elevated:    #22263a;   /* inputs, dropdowns, hover */
  --color-bg-overlay:     #2a2f47;   /* modales, tooltips */

  /* ── ACENTO INSTITUCIONAL ── */
  /* Azul salesiano — elegante, relacionado con Fe y confianza */
  --color-accent:         #4f8ef7;   /* botones primarios, links activos */
  --color-accent-soft:    #1e3a6e;   /* fondos de badges activos */
  --color-accent-dim:     #2c3f6e;   /* hover sutil en elementos de acento */

  /* ── ESTADO ── */
  --color-success:        #34d399;   /* aprobado, activo */
  --color-success-soft:   #064e3b;
  --color-warning:        #fbbf24;   /* pendiente, en proceso */
  --color-warning-soft:   #451a03;
  --color-danger:         #f87171;   /* reprobado, crítico, error */
  --color-danger-soft:    #450a0a;
  --color-info:           #60a5fa;   /* información neutral */

  /* ── TEXTO ── */
  --color-text-primary:   #f1f5f9;   /* títulos, datos principales */
  --color-text-secondary: #94a3b8;   /* subtítulos, etiquetas */
  --color-text-muted:     #475569;   /* placeholders, datos desactivados */
  --color-text-inverse:   #0f1117;   /* texto sobre fondos claros */

  /* ── BORDES ── */
  --color-border:         #2d3348;   /* bordes de tarjetas y tablas */
  --color-border-subtle:  #1e2235;   /* separadores internos */

  /* ── TIPOGRAFÍA ── */
  --font-sans:     'Inter', 'Segoe UI', sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs:  0.75rem;    /* 12px */
  --font-size-sm:  0.875rem;   /* 14px */
  --font-size-md:  1rem;       /* 16px */
  --font-size-lg:  1.125rem;   /* 18px */
  --font-size-xl:  1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px — números KPI */

  /* ── ESPACIADO ── */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-12: 3rem;

  /* ── BORDES REDONDEADOS ── */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* ── SOMBRAS ── */
  --shadow-card:  0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-modal: 0 25px 50px rgba(0,0,0,0.6);

  /* ── SIDEBAR ── */
  --sidebar-width:          240px;
  --sidebar-collapsed-width: 64px;

  /* ── TRANSICIONES ── */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
}

/* ── MODO CLARO ── */
[data-theme="light"] {
  --color-bg-base:        #f8fafc;
  --color-bg-surface:     #ffffff;
  --color-bg-elevated:    #f1f5f9;
  --color-bg-overlay:     #e2e8f0;

  --color-accent:         #2563eb;
  --color-accent-soft:    #dbeafe;
  --color-accent-dim:     #bfdbfe;

  --color-success:        #059669;
  --color-success-soft:   #d1fae5;
  --color-warning:        #d97706;
  --color-warning-soft:   #fef3c7;
  --color-danger:         #dc2626;
  --color-danger-soft:    #fee2e2;

  --color-text-primary:   #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted:     #94a3b8;
  --color-text-inverse:   #f8fafc;

  --color-border:         #e2e8f0;
  --color-border-subtle:  #f1f5f9;

  --shadow-card:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-modal: 0 25px 50px rgba(0,0,0,0.15);
}
```

### Componentes de diseño clave
```
KPI Card:
  - Número grande (--font-size-4xl, --color-text-primary)
  - Etiqueta pequeña arriba (--font-size-xs, --color-text-secondary, uppercase)
  - Indicador de cambio (verde/rojo con icono TrendingUp/TrendingDown de Lucide)
  - Fondo: --color-bg-surface con borde --color-border

Tabla de datos (inspirada en CRM panel):
  - Encabezado: --color-bg-elevated, texto --color-text-secondary
  - Filas alternadas sutiles: odd --color-bg-surface, even --color-bg-elevated
  - Badges de estado con colores semánticos (success/warning/danger)
  - Acciones al final de fila con iconos Lucide

Sidebar:
  - Fondo: --color-bg-surface
  - Item activo: --color-accent-soft con borde izquierdo --color-accent (3px)
  - Íconos Lucide de 18px, texto --font-size-sm
  - Colapsable en tablet, drawer en móvil

Gráficas Recharts:
  - Fondo transparente
  - Colores: ['#4f8ef7', '#34d399', '#fbbf24', '#f87171', '#a78bfa']
  - Grid: --color-border-subtle
  - Tooltip: --color-bg-overlay con border --color-border
```

### Responsive
```
Mobile  (< 768px):  sidebar como drawer, cards apiladas, tablas scrolleables
Tablet  (768-1024): sidebar colapsada (solo íconos), grid 2 columnas
Desktop (> 1024px): sidebar expandida, grid completo, tablas sin scroll
```

---

## 7. PÁGINAS PÚBLICAS (sin login requerido)

Estas páginas conforman el sitio web institucional del CECMA accesible a cualquier visitante.

### Rutas públicas
```
/                       → Inicio (hero, misión, cifras, actividades recientes)
/historia               → Historia de la institución desde 1912
/mision-vision          → Misión, visión y valores
/oferta-educativa       → Niveles: Parvularia, Primaria, Secundaria, Bachillerato
/actividades            → Galería de actividades y noticias institucionales
/cuadro-honor           → Cuadro de honor público del periodo actual
/contacto               → Datos de contacto, mapa, formulario
/acceso                 → Login del sistema (redirect si ya hay sesión)
```

### Contenido de la página /historia
Debe incluir:
- Llegada de las FMA a Chalchuapa en 1912 impulsada por Don Salvador Morán
- Inicio como Hospicio Santa Rosa
- 1924: reconocimiento oficial como Colegio María Auxiliadora
- 1980: Fundación del Complejo Educativo, Mons. Pedro Arnoldo Aparicio Quintanilla
- Primera comunidad: Hna. María Zoila Acosta, Hna. Sonia Eureistele Pérez, Hna. Juana Antonia Rivas y 80 alumnos
- 1991: Reinauguración del local actual
- 2000-2001: Primera promoción de bachilleres
- Hoy: 809 alumnos, 32 docentes, 10 religiosas HDS

### Contenido de /contacto
```
Dirección:  Final 10a. Av. Sur y Calle hacia el Cantón El Arado,
            Barrio San Sebastián, Chalchuapa, Santa Ana, El Salvador
Teléfono:   2444-0215
Email dir.: hdsamelia24@hotmail.com
Email com.: mendezhds81@yahoo.es (María Magdalena Méndez)
Tel. com.:  7930-2740
Facebook:   facebook.com/salesmariauxiliadora
Horario:    Lunes a Viernes, 7:00 AM – 4:00 PM
```

---

## 8. DASHBOARD POR ROL — ESPECIFICACIONES

### Dashboard DIRECTOR (vista completa)
Sección KPIs superiores (4 cards):
- Total de alumnos activos / variación vs año anterior
- Total de docentes activos
- Promedio general de la institución del periodo actual
- Alumnos en riesgo (promedio < nota mínima) con porcentaje

Sección central (2 columnas):
- Gráfica de barras: Promedio por grado en el periodo actual (Recharts BarChart)
- Gráfica de dona: Distribución de estado de alumnos (Activo/Retirado/Graduado)

Sección inferior (3 columnas):
- Lista de fichas de atención recientes (últimas 5, con estado y gravedad)
- Calendario de eventos próximos (siguiente semana)
- Cuadro de honor del periodo actual (top 5)

### Dashboard MAESTRO (vista de sus secciones)
Sección KPIs:
- Alumnos a su cargo (por sección y total)
- Promedio de sus secciones
- Actividades pendientes de calificar
- Fichas emitidas en el periodo actual

Sección central:
- Tabla de alumnos filtrable por sección/materia con nota actual y estado
- Gráfica de líneas: evolución del promedio de la clase por actividad (Recharts LineChart)

Sección inferior:
- Actividades próximas a vencer (próximos 7 días)
- Mural: últimas publicaciones
- Alumnos con promedio más bajo (alertas)

### Dashboard RESPONSABLE (portal de padres)
- Selector de hijo (si tiene más de uno)
- Card resumen por materia: nota actual, actividades pendientes
- Gráfica de barras horizontales: nota por materia vs nota mínima
- Fichas de atención activas del hijo (con badge de acuse)
- Calendario: actividades y eventos relevantes al grado del hijo
- Anuncios no leídos

---

## 9. LÓGICA DE NEGOCIO CRÍTICA

### Cálculo de notas
```typescript
// Aporte de una actividad al periodo:
aporte = (nota_obtenida / nota_maxima) * porcentaje_peso

// Promedio del periodo para una materia:
promedio_periodo = SUM(aporte de cada actividad calificada)

// Cuánto le falta al alumno para aprobar:
peso_restante = 100 - SUM(porcentaje_peso de actividades ya calificadas)
puntos_faltantes = nota_minima_seccion - promedio_actual
si puntos_faltantes > peso_restante → ya no puede aprobar el periodo

// Ejemplo concreto:
// Julio, Matemáticas, 2do Grado C, 3er Periodo, nota mínima = 5.0
// Actividad A (peso 20%, nota máx 10): Julio saca 8 → aporte = 1.6
// Actividad B (peso 30%, nota máx 10): Julio saca 7 → aporte = 2.1
// Promedio actual = 3.7 sobre 50% calificado
// Peso restante = 50% | Necesita = 5.0 - 3.7 = 1.3 puntos más
// Puede aprobar: SÍ (tiene 50% de peso aún disponible)
```

### Validación de horarios (conflicto)
```sql
-- Antes de insertar en horarios_clases, ejecutar:
SELECT COUNT(*) FROM horarios_clases
WHERE fecha_elim IS NULL
  AND anio_lectivo_id = $anio_lectivo_id
  AND dia_semana = $dia_semana
  AND (maestro_id = $maestro_id OR aula_id = $aula_id)
  AND NOT (hora_fin <= $hora_inicio OR hora_inicio >= $hora_fin);
-- Si COUNT > 0 → HTTP 409 con mensaje descriptivo del conflicto
```

### Suma de pesos por periodo (máximo 100%)
```typescript
// Antes de crear una actividad:
const pesoActual = await actividadRepository.sumaPesosPorPeriodo(
  seccionMateriaId, periodoEvaluacionId
);
if (pesoActual + dto.porcentajePeso > 100) {
  throw new DomainError('La suma de pesos del periodo superaría el 100%', 400, 'PESO_EXCEDIDO');
}
```

### Inscripción única activa
```typescript
// Un alumno solo puede tener UNA inscripción con estado ACTIVO por año lectivo
const yaInscrito = await inscripcionRepository.findActiva(alumnoId, anioLectivoId);
if (yaInscrito) {
  throw new DomainError('El alumno ya tiene una inscripción activa este año', 409, 'YA_INSCRITO');
}
```

### Generación automática de notas_actividades
```typescript
// Al crear una actividad, generar registro PENDIENTE para cada alumno inscrito:
const alumnos = await inscripcionRepository.findAlumnosBySeccion(seccionId, anioLectivoId);
await notaActividadRepository.createManyPendiente(actividad.id, alumnos.map(a => a.alumnoId));
```

---

## 10. AUTENTICACIÓN Y SEGURIDAD

### Flujo JWT
```
POST /api/auth/login
  → auth-service valida email + hash de contraseña
  → genera access_token (15 min) + refresh_token (7 días)
  → refresh_token guardado en httpOnly cookie + hash en DB
  → access_token retornado en body

Cada request al gateway:
  → valida access_token
  → inyecta headers internos: X-User-Id, X-User-Role, X-Person-Id
  → los servicios NO re-validan el token, confían en los headers

POST /api/auth/refresh
  → lee httpOnly cookie
  → valida refresh_token hash en DB
  → emite nuevo access_token

POST /api/auth/logout
  → invalida refresh_token en DB (eliminar hash)
```

### Payload JWT
```typescript
interface JwtPayload {
  sub: string;       // user_id (UUID)
  role: 'ADMIN' | 'DIRECTOR' | 'MAESTRO' | 'RESPONSABLE' | 'ALUMNO';
  personId: string;  // persona_id
  iat: number;
  exp: number;
}
```

---

## 11. REGLAS DE CÓDIGO (aplicar siempre)

### Arquitectura hexagonal — separación estricta
```
domain/services/   → SOLO lógica de negocio. Sin imports de Express, Prisma, Redis.
application/       → Casos de uso. Orquestan el dominio. Sin imports de Express.
infrastructure/    → TODO lo externo: HTTP, DB, mensajería, archivos.
```

### Errores de dominio (nunca Error genérico)
```typescript
// domain/errors/DomainError.ts
export class DomainError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code: string = 'DOMAIN_ERROR'
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
// Uso: throw new DomainError('Peso excedido', 400, 'PESO_EXCEDIDO');
```

### Interfaces de repositorio en el dominio
```typescript
// domain/repositories/INotaActividadRepository.ts
export interface INotaActividadRepository {
  findByActividad(actividadId: string): Promise<NotaActividad[]>;
  save(nota: NotaActividad): Promise<NotaActividad>;
  createManyPendiente(actividadId: string, alumnoIds: string[]): Promise<void>;
}
// La implementación Prisma vive en infrastructure/persistence/
```

### Controllers: solo orquestar
```typescript
// ✅ Correcto
export const crearActividad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = crearActividadSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;
    const result = await crearActividadUseCase.execute(dto, userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};
```

### Nunca en este proyecto
- `console.log` — usar `logger.info/warn/error` de `@edutrack/logger`
- `any` implícito en TypeScript
- DELETE físico en tablas de negocio
- Lógica de negocio en controllers o repositories
- Queries Prisma directas en controllers
- Hardcodear URLs, secretos o valores de configuración
- Usar emojis en la UI — solo iconos Lucide React
- Degradados exagerados — usar colores sólidos del token system

### Respuesta HTTP estándar
```typescript
// Éxito:       { success: true, data: {...} }
// Paginado:    { success: true, data: [...], meta: { total, page, limit } }
// Error:       { success: false, error: { code: 'PESO_EXCEDIDO', message: '...' } }
```

### Variables de entorno — validar al inicio con Zod
```typescript
// infrastructure/config/env.ts
const envSchema = z.object({
  PORT: z.string().transform(Number).default('4001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
});
export const env = envSchema.parse(process.env);
```

---

## 12. ORDEN DE DESARROLLO — 16 SEMANAS

```
FASE 1 — Infraestructura (Semanas 1-2)
  [ ] Monorepo pnpm workspaces
  [ ] packages/shared-types, logger, prisma-client
  [ ] docker-compose.yml (postgres, redis, todos los servicios)
  [ ] Schema Prisma completo con todas las tablas
  [ ] Seed de datos iniciales (configuracion, niveles, ciclos, grados)

FASE 2 — Gateway y Auth (Semanas 2-3) ← PRIORIDAD ACTUAL
  [ ] apps/gateway — JWT validation, routing, headers internos
  [ ] apps/auth-service — login, refresh, logout (arquitectura hexagonal)

FASE 3 — Personas y Estructura (Semanas 4-5)
  [ ] apps/personas-service — CRUD personas, usuarios, alumnos, maestros, responsables
  [ ] apps/academico-service — grados, secciones, materias, seccion_materias

FASE 4 — Inscripciones y Horarios (Semanas 6-7)
  [ ] apps/inscripciones-service — matrícula, retiro, cambio de turno
  [ ] apps/horarios-service — horarios, aulas, detección de conflictos

FASE 5 — Calificaciones (Semanas 8-9) ← EL CORAZÓN
  [ ] apps/calificaciones-service — periodos, actividades, notas, promedios

FASE 6 — Fichas y Calendario (Semanas 10-11)
  [ ] apps/calendario-service — fichas, eventos, anuncios, cuadro de honor
  [ ] apps/notificaciones-service — Redis consumer, notificaciones básicas

FASE 7 — Frontend (Semanas 12-14)
  [ ] apps/web — diseño del sistema de tokens, layout base, sidebar
  [ ] Páginas públicas: inicio, historia, misión, contacto, cuadro de honor
  [ ] Dashboard director, maestro y responsable
  [ ] Módulos: inscripciones, calificaciones, fichas

FASE 8 — Pulido y Graduación (Semanas 15-16)
  [ ] apps/reportes-service — libreta PDF, ranking, KPIs
  [ ] Pruebas E2E, corrección de bugs
  [ ] Documentación técnica para trabajo de graduación
  [ ] Demo final

MÓDULOS OPCIONALES (solo si sobra tiempo)
  [ ] Notificaciones push FCM reales
  [ ] Exportación Excel de calificaciones
  [ ] Módulo de promociones con impresión de diploma
```

---

## 13. CÓMO INICIAR CADA SESIÓN DE DESARROLLO

Proporcionar siempre al inicio de la sesión:
1. En qué servicio o módulo se trabaja
2. Si es feature nueva, bug o refactorización
3. Estado actual (qué funciona, qué falta)

### Prompt de ejemplo para inicio de sesión
```
Contexto: EduTrack para el CECMA (ver CLAUDE.md).
Servicio: calificaciones-service
Tarea: Implementar el caso de uso 'CrearActividad' con validación de suma de pesos,
       generación automática de notas_actividades en estado PENDIENTE para todos
       los alumnos inscritos en la sección.
Estado: El schema Prisma ya existe. El personas-service y academico-service ya están.
Seguir arquitectura hexagonal y todas las reglas del CLAUDE.md.
```

### Lo que Claude siempre debe hacer
- Separar domain / application / infrastructure estrictamente
- Validar con Zod en la capa HTTP (infrastructure), no en el dominio
- Filtrar `fecha_elim IS NULL` en todos los queries
- Registrar en `registros_auditoria` los cambios de notas, inscripciones y fichas
- Usar `DomainError` para errores de negocio
- Usar tokens CSS de `tokens.css` para cualquier componente de UI
- Usar iconos de Lucide React, nunca emojis
- Mantener responsive: mobile / tablet / desktop
