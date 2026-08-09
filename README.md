# FutbolJoven — Player Development & Performance Management System

Plataforma profesional de gestión, seguimiento y desarrollo de jugadores de fútbol formativo. Permite registrar jugadores, categorías y temporadas; evaluar periódicamente a cada jugador con dimensiones configurables (técnica, táctica, física, mental, resiliencia, social); visualizar su evolución histórica con gráficos radar y de línea de tiempo; y controlar el acceso a la información mediante roles y permisos aplicados tanto en frontend como en backend.

Este repositorio contiene el **MVP funcional** descripto en el plan del proyecto: autenticación + RBAC, temporadas/categorías/equipos, jugadores con historial de trayectoria, evaluaciones configurables con evolución real, dashboard por rol, auditoría y datos de demostración. Los módulos de nutrición, físico, informes PDF, import/export de Excel, analítica avanzada, notificaciones y la app móvil quedan con su modelo de datos ya diseñado (ver `apps/api/prisma/schema.prisma`) pero sin UI/lógica todavía — son la fase siguiente del roadmap (más abajo).

## Stack y decisiones de arquitectura

| Capa | Tecnología | Por qué |
|---|---|---|
| Monorepo | pnpm workspaces | Comparte tipos/validaciones entre `api` y `web` sin publicar paquetes |
| Backend | NestJS + TypeScript | Estructura modular, DI, guards — apropiado para RBAC y un sistema que va a crecer por años |
| Base de datos | PostgreSQL (producción) / SQLite (dev por defecto) | Ver sección **Base de datos** abajo |
| ORM | Prisma | Migraciones versionadas, tipado end-to-end |
| Frontend web | Next.js 14 (App Router) + TypeScript + Tailwind | SPA con rutas protegidas, consumiendo la API REST — la misma API podrá ser consumida por una futura app móvil (Expo) |
| Gráficos | Recharts | Radar de habilidades y evolución temporal, con calidad suficiente para presentaciones |
| Autenticación | JWT (access + refresh) en cookies httpOnly | El access token vive 15 min; el refresh rota en cada uso y se guarda hasheado en DB para poder revocarlo |
| RBAC | Roles y permisos como filas en DB (no hardcodeados) | El admin puede crear roles nuevos sin tocar código. Cada endpoint valida permisos en el backend — nunca solo se ocultan botones en el frontend |

### Por qué API separada del frontend

Aunque Next.js permite server actions/API routes propias, se optó por una **API NestJS independiente** porque la especificación pide una futura app móvil (React Native/Expo) que debe consumir la misma lógica de negocio. Una API REST propia evita duplicar reglas de permisos/scoping entre un backend embebido en Next.js y un backend separado para mobile.

### RBAC y scoping por fila

- `Role` y `Permission` son tablas editables — sección **Roles y permisos** en el admin permite crear roles nuevos y togglear permisos por rol.
- Cada endpoint sensible usa `@RequirePermission(...)` (`apps/api/src/auth/decorators/require-permission.decorator.ts`), validado por `PermissionsGuard`.
- Además del check de permiso, los módulos de **jugadores**, **evaluaciones** y **dashboard** aplican *scoping a nivel de fila*: un usuario con el permiso "assigned" (ej. `COACH`) solo puede ver/editar jugadores de los equipos que tiene asignados (`UserTeamAssignment`). Esto se resuelve en la capa de servicio (`apps/api/src/common/scope.util.ts`), no en el frontend — confirmado con tests e2e (`apps/api/test/app.e2e-spec.ts`).

### Evaluaciones configurables e historial inmutable

`EvaluationScale`, `EvaluationDimension` y `EvaluationMetric` viven en DB y se seedean con los valores del prompt (escala 1-10, dimensiones técnica/táctica/física/mental/resiliencia/social) pero son editables desde el backend (`/api/evaluations/config/*`, permiso `evaluations.config.manage`). Cada evaluación crea una fila nueva en `Evaluation`/`EvaluationScore`; nunca se sobrescribe una puntuación anterior, por lo que los gráficos de evolución reflejan el historial real.

## Base de datos: SQLite (dev) vs PostgreSQL (producción)

El schema fue diseñado para PostgreSQL (ver sección 36 del brief original), pero el entorno donde se construyó este proyecto tenía Docker Desktop roto (falta el kernel de WSL2) y la instalación nativa de PostgreSQL 17 quedó sin contraseña de superusuario conocida y sin poder editar `pg_hba.conf` por restricciones del sandbox. Para no bloquear el desarrollo, **el datasource de Prisma está configurado con SQLite** (`apps/api/prisma/schema.prisma`, `apps/api/.env` → `DATABASE_URL="file:./dev.db"`), que no requiere ningún servicio corriendo.

Por eso los modelos evitan dos features que SQLite no soporta en Prisma (`enum` nativo y columnas de tipo lista): los campos de estado fijo (`Player.status`, `dominantFoot`, posiciones, `Evaluation.type`) son `String` validados con los enums de zod en `packages/shared/src/schemas.ts`, y `Player.secondaryPositions` es una tabla de unión (`PlayerSecondaryPosition`) en vez de un array. Ambos patrones funcionan igual en PostgreSQL, así que **pasar a Postgres no requiere cambiar ningún modelo**, solo:

1. PostgreSQL 17 ya está instalado en esta máquina (`C:\Program Files\PostgreSQL\17`), corriendo como servicio de Windows — falta setear la contraseña del rol `postgres` (por ejemplo desde pgAdmin, incluido en la instalación) y crear la base `futboljoven`.
2. En `apps/api/prisma/schema.prisma`, cambiar `provider = "sqlite"` a `provider = "postgresql"`.
3. En `apps/api/.env`, cambiar `DATABASE_URL` a algo como `postgresql://futboljoven:<password>@localhost:5432/futboljoven?schema=public`.
4. Correr `pnpm --filter @futboljoven/api prisma migrate dev` para regenerar las migraciones contra Postgres.
5. (Opcional) `infra/docker-compose.yml` ya deja un servicio de Postgres 16 listo para cuando Docker Desktop funcione en esta máquina (`docker compose up -d` desde `infra/`).

## Estructura del repositorio

```
FutbolJoven/
  apps/
    api/        NestJS + Prisma — API REST en http://localhost:3001/api
    web/        Next.js — app web en http://localhost:3000
  packages/
    shared/     Tipos, esquemas zod y constantes de permisos compartidos
  infra/
    docker-compose.yml   Postgres 16 para cuando Docker esté disponible
```

## Puesta en marcha

Requisitos: Node 20+, pnpm (`npm install -g pnpm` si no lo tenés).

```bash
pnpm install
pnpm --filter @futboljoven/shared build   # compila el paquete compartido a JS (necesario antes de correr api/web)
pnpm --filter @futboljoven/api prisma migrate dev   # crea apps/api/prisma/dev.db y aplica el schema
pnpm --filter @futboljoven/api prisma db seed        # carga datos de demostración
```

Levantar ambos servicios (en dos terminales, o usando el panel de preview):

```bash
pnpm --filter @futboljoven/api dev    # http://localhost:3001/api
pnpm --filter @futboljoven/web dev    # http://localhost:3000
```

### Variables de entorno

Cada app tiene su propio `.env.example`:
- `apps/api/.env.example` → `DATABASE_URL`, secretos JWT, `WEB_ORIGIN`, etc.
- `apps/web/.env.example` → `NEXT_PUBLIC_API_URL`

Copiá cada uno a `.env` (o `.env.local` en el caso de web) y ajustá lo que necesites. **Nunca** commitear `.env` con secretos reales — el `.gitignore` ya lo excluye.

### Usuarios de demostración

Después de correr el seed (`prisma db seed`), podés entrar con cualquiera de estos usuarios (contraseña `Demo1234!` para todos):

| Email | Rol |
|---|---|
| admin@futboljoven.demo | Super Administrador |
| director@futboljoven.demo | Director Deportivo |
| coordinador@futboljoven.demo | Coordinador de Fútbol Formativo |
| coach1@futboljoven.demo … coach4@futboljoven.demo | Profesor / Entrenador (cada uno con 2 categorías asignadas) |
| nutricion@futboljoven.demo | Nutricionista |
| fisico@futboljoven.demo | Preparador Físico |
| scout@futboljoven.demo | Scout / Analista |

El seed genera 8 categorías (Sub-13 a Primer Equipo) en 2 temporadas, 120 jugadores ficticios con trayectoria entre categorías y ~700 evaluaciones históricas, todo marcado `isDemo: true` en la base.

## Tests

```bash
pnpm --filter @futboljoven/api test
```

Corre una suite e2e (NestJS + Supertest) contra una base SQLite de test aislada (se recrea automáticamente antes de cada corrida). Cubre: login correcto/incorrecto, rechazo de requests sin sesión, bloqueo de endpoints sin el permiso requerido, scoping de jugadores por equipo asignado (un coach no puede ver ni editar jugadores fuera de sus equipos), y el cálculo de evolución/radar a partir de múltiples evaluaciones.

## Build para producción

```bash
pnpm --filter @futboljoven/shared build
pnpm --filter @futboljoven/api build      # dist/ compilado con tsc
pnpm --filter @futboljoven/web build      # build de Next.js
```

Notas de deploy:
- El backend necesita `DATABASE_URL` apuntando a PostgreSQL, y los secretos JWT vía variables de entorno (nunca hardcodeados).
- Correr `prisma migrate deploy` (no `migrate dev`) en el pipeline de deploy.
- El frontend necesita `NEXT_PUBLIC_API_URL` apuntando a la URL pública de la API, y la API necesita `WEB_ORIGIN` apuntando al dominio del frontend para que CORS + cookies funcionen.
- Fotos de jugador: hoy no hay endpoint de upload implementado; el campo `Player.photoUrl` y la arquitectura (`UPLOADS_DIR` en `.env`) están preparados para agregar un `StorageAdapter` (local en dev, S3-compatible en producción) en la siguiente fase.

## Roadmap (fases siguientes)

Ya construido en esta pasada (Fase 1 — MVP):
- Auth + RBAC granular y configurable, con scoping por equipo aplicado en backend.
- Temporadas, categorías, equipos, usuarios y roles (CRUD completo).
- Jugadores: alta/edición/baja, perfil completo con historial de categorías/temporadas.
- Evaluaciones configurables (dimensiones/métricas/escala), carga rápida por categoría, historial inmutable.
- Radar de habilidades y gráfico de evolución por dimensión, con comparación vs. evaluación anterior y promedio de categoría.
- Dashboard con KPIs, distinto para dirección (global) y profesores (sus equipos).
- Auditoría de cambios (quién, cuándo, qué cambió) sobre jugadores, evaluaciones y usuarios.
- Datos de demostración realistas y tests e2e de los flujos críticos.

Pendiente (schema ya migrado, sin UI/lógica — Fase 2/3):
- Nutrición y físico: modelos `NutritionRecord`/`PhysicalRecord` listos; falta CRUD + gráficos + permisos específicos por dato sensible.
- Informes PDF (jugador y dirección deportiva) y exportación/importación masiva a Excel.
- Comparación entre jugadores y entre categorías, analítica avanzada (tendencias, ranking interno).
- Notificaciones (modelo `Notification` listo, sin canal de envío real).
- App móvil (Expo) consumiendo la misma API, con soporte offline.
- Hooks de IA para resúmenes/detección de tendencias (asistencia, nunca reemplazo del criterio del cuerpo técnico).
