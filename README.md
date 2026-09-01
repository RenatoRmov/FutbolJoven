# FutbolJoven — Player Development & Performance Management System

Plataforma profesional de gestión, seguimiento y desarrollo de jugadores de fútbol formativo. Permite registrar jugadores, categorías y temporadas; evaluar periódicamente a cada jugador con dimensiones configurables (técnica, táctica, física, mental, resiliencia, social); visualizar su evolución histórica con gráficos radar y de línea de tiempo; y controlar el acceso a la información mediante roles y permisos aplicados tanto en frontend como en backend.

Este repositorio contiene dos fases: el **MVP** (auth/RBAC, temporadas/categorías/equipos, jugadores, evaluaciones, dashboard, auditoría) y una **Fase 2** que reemplaza varias suposiciones genéricas por el **modelo real de un club de fútbol formativo** (matriz de evaluación ponderada, clasificación de talento, nutrición, médico/lesiones, documentación de habilitación de jugadores, e import/export de Excel — ver "Fase 2: el modelo real del club" más abajo). Informes PDF, analítica avanzada, notificaciones y la app móvil quedan con su modelo de datos ya diseñado (ver `apps/api/prisma/schema.prisma`) pero sin UI/lógica todavía — son la fase siguiente del roadmap (más abajo).

**En producción:** [futboljoven.vercel.app](https://futboljoven.vercel.app) (frontend, Vercel) · API en Railway con PostgreSQL — 194 jugadores reales cargados, sin datos demo. Login: `admin@futboljoven.demo` / `Demo1234!` (cambiar antes de entregarle el sistema al club).

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

## Fase 2: el modelo real del club

El club entregó documentos internos reales (planilla de control semanal, matriz de evaluación, fichas de habilitación/médico/nutrición, y el "Programa de Desarrollo del Fútbol Joven") que reemplazan varias suposiciones genéricas de la Fase 1:

- **Matriz de evaluación ponderada real**: Técnica 35%, Táctica 25%, Física 20%, Mental/Actitudinal 10%, Rendimiento/Minutos 10% (`packages/shared/src/evaluation.ts` → `DEFAULT_DIMENSIONS`, campo `weight` en `EvaluationDimension`). Cada evaluación calcula su **Nota Final** ponderada (`computeNotaFinal`) y un **Estatus de talento** — PROYECTADO / PROYECTABLE / EN DESARROLLO / LIMITADO / NO APTO — sobre umbrales reales (`computeTalentStatus`, `TALENT_STATUS_THRESHOLDS`). Nunca se guarda como valor fijo: se recalcula siempre con los pesos configurados en ese momento (`apps/api/src/evaluations/evaluations.service.ts`).
- **Jugadores**: campo `gender` y taxonomía de posiciones real en español (Portero, Lateral Derecho/Izquierdo, Defensa Central, Mediocentro, Volante/Volante Ofensivo/Mixto, Extremo Der/Izq, Delantero Centro, Delantero).
- **Nutrición** (`/api/nutrition`, pestaña "Nutrición" en el perfil del jugador): composición corporal, hábitos alimenticios, hidratación y resultados de laboratorio, según la ficha real del club.
- **Médico y físico** (`/api/physical`, `/api/injuries`, pestaña "Físico y Salud"): baterías de test físicos periódicas (`PhysicalRecord`) y lesiones como eventos discretos (`Injury`, el "REGISTRO M" del club) — modelos separados a propósito, uno es periódico y el otro es un evento con fecha/severidad/recuperación.
- **Documentación/Habilitación** (`/api/document-types`, `/api/players/:id/documents`, pestaña "Documentación"): checklist real de 18 documentos (ingreso, salida/traspaso, protocolo de inmigración para menores extranjeros), configurable vía `DocumentType`.
- **Dashboard con gráficos reales** (pedido explícito): Nota Final promedio por categoría, distribución de Estatus del plantel, tendencia de la nota promedio del club, y listas de jugadores con mayor crecimiento/en seguimiento — diseñados siguiendo la skill de dataviz del equipo (formas por el trabajo del dato: barras para magnitud, no donut para reparto de estatus; colores de estado fijos, nunca generados).

**Separación de datos sensibles** (exigida en el brief original): un nutricionista puede escribir en `/api/nutrition` pero no en `/api/evaluations`; un preparador físico puede escribir en `/api/physical`/`/api/injuries` pero no en `/api/nutrition`. Verificado con tests e2e (`apps/api/test/app.e2e-spec.ts`, describe "Sensitive data separation").

**Deliberadamente fuera de esta plataforma** (dominio distinto — gestión administrativa/financiera del club, no desarrollo de jugadores): la matriz financiera del club (ingresos/gastos, proyección presupuestaria a 10 años) y la carta Gantt anual de 52 semanas con tareas por responsable. Quedan documentadas acá como posible módulo futuro si el club lo pide explícitamente.

## Fase 2b: Import/Export de Excel + plantel real cargado

La Planilla real del club (`Planilla Control de Jugadores Final.xlsx`) tenía **194 jugadores reales** con nombre, RUT (cédula chilena) y fecha de nacimiento en sus 7 categorías. Antes de cargarlos se construyó el módulo de importación/exportación completo (era el único camino aceptable — nunca se insertan datos personales de menores "a mano" por script sin una vía revisable y reutilizable):

- `GET /api/import/players/template` — descarga la plantilla `.xlsx` (columnas obligatorias marcadas con `*`, fila de ejemplo, hoja de instrucciones) — ver `packages/shared/src/import.ts` → `PLAYER_IMPORT_COLUMNS` para la definición única de columnas.
- `POST /api/import/players/preview` — sube un `.xlsx`, valida cada fila (categoría existente, fechas en varios formatos, tipos) y clasifica cada una en **a crear / a actualizar (por RUT) / duplicada dentro del archivo / con error** — sin escribir nada en la base todavía.
- `POST /api/import/players/confirm` — recibe las filas ya validadas y recién ahí crea/actualiza jugadores (reutiliza `PlayersService.create`/`update`, así que el historial de categorías y la auditoría quedan igual que si se cargaran a mano).
- `GET /api/export/players` — exporta a `.xlsx` los jugadores visibles para el usuario (respeta el mismo scoping por equipo que el resto de la API).
- Pantalla **Importar / Exportar** en el frontend con la vista previa, el resumen (importados/actualizados/duplicados/errores) y la exportación.

El plantel real se cargó con este mismo mecanismo (no con un script aparte): los datos de identidad de las 7 hojas de la Planilla se transformaron al formato de la plantilla y se subieron por `/api/import/players/preview` → `/api/import/players/confirm`, quedando 194 jugadores reales sumados a los datos demo. Solo se importó identidad básica (nombre, RUT, fecha de nacimiento, categoría, nacionalidad) — la Planilla no traía posición/dorsal por jugador en esa hoja, así que esos campos quedan vacíos hasta que se completen desde la ficha del jugador.

## Fase 3: identidad visual del club + Fixture + Financiero + informes PDF firmados

A partir de un mockup de referencia enviado por el club (paleta roja/dorada/carbón, tipografías Bebas Neue + Inter, tarjetas y pills redondeadas) se hizo un rebranding visual completo del frontend — se retiró el tema oscuro genérico y se reemplazó por la identidad de Club Deportes Limache en `apps/web/tailwind.config.ts`, `globals.css` y todos los componentes de `components/ui/*` y `components/charts/*`. La estructura de navegación de escritorio se mantiene (no se copió el layout de celular del mockup), pero es responsive: en pantallas angostas el sidebar se convierte en una barra horizontal.

Funcionalidad nueva:
- **Dashboard**: se agregaron KPIs de Promedio de Nota Final, Promedio de IMC (calculado desde el registro de nutrición más reciente de cada jugador — no se inventa un índice combinando tests físicos sin unidades comparables), Promedio de altura, y el conteo Apto/En Reintegro/No Apto derivado del estado de la lesión activa más reciente de cada jugador.
- **Fixture** (`apps/api/src/fixtures/`, `Match`/`MatchAppearance` en el schema): carga de partidos por equipo (rival, fecha, hora de citación/partido, estadio, staff del día — técnico/PF/kine/utilero) y cierre de partido con resultado + minutos/goles/tarjetas por jugador en una sola operación. Alimenta directamente la pestaña **"Minutos y Partidos"** del perfil del jugador (antes solo existía como una métrica cualitativa 1-10 dentro de la dimensión "Rendimiento").
- **Notas Técnicas**: la pestaña de evaluaciones existente se renombró para diferenciarla claramente de "Minutos y Partidos" — mismos datos, solo la separación conceptual que pidió el club.
- **Financiero** (`apps/api/src/finance/`, modelo `FinancialEntry`): ledger simple de ingresos/gastos con categoría libre, totales y balance mensual — visible solo con permisos `finance.view`/`finance.manage` (Director/Coordinador/Super Admin).
- **Informes PDF firmados** (`apps/api/src/reports/`, generados con `pdfkit` — sin navegador headless, mismo criterio que ya se usó para no complicar el build de Docker): ficha individual por jugador y reporte agregado por categoría/equipo, ambos con un bloque de firma impresa (Jacob Eduardo Donoso Miranda — Director Deportivo, y Renato Jesús Oliva Aguirre) como huella de auditoría de quién generó cada informe.

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

El seed genera 8 categorías (Sub-13 a Sub-20, Femenina Juvenil y Primer Equipo, con los nombres reales del club) en 2 temporadas, 120 jugadores ficticios con trayectoria entre categorías y ~700 evaluaciones históricas ponderadas, además de registros de nutrición, lesiones y checklist de documentación — todo marcado `isDemo: true` en la base.

Además, esta instancia local ya tiene cargados **194 jugadores reales** (identidad únicamente: nombre, RUT, fecha de nacimiento, categoría) importados desde la Planilla del club vía el módulo de Import/Export (ver "Fase 2b" más arriba) — no vienen del seed, así que si borrás y recreás la base de datos **no se regeneran solos**; para volver a cargarlos hay que repetir la importación desde `/import-export` con un Excel en el formato de la plantilla.

> El seed **no es idempotente para jugadores/evaluaciones** (cada corrida crea filas nuevas). Si necesitás re-sembrar, borrá `apps/api/prisma/dev.db` primero y volvé a correr `prisma migrate deploy` + `prisma db seed` para partir de una base limpia.

## Tests

```bash
pnpm --filter @futboljoven/api test
```

Corre una suite e2e (NestJS + Supertest) contra una base SQLite de test aislada (se recrea automáticamente antes de cada corrida, 20 tests). Cubre: login correcto/incorrecto, rechazo de requests sin sesión, bloqueo de endpoints sin el permiso requerido, scoping de jugadores por equipo asignado (un coach no puede ver ni editar jugadores fuera de sus equipos), el cálculo de evolución/radar a partir de múltiples evaluaciones, el cálculo de Nota Final/Estatus contra los umbrales reales, la separación de datos sensibles entre nutrición y físico/médico, y el flujo de import/export (categoría inexistente → error, mismo RUT en dos cargas → detecta actualización en vez de duplicado, permisos de `data.import`/`data.export`).

## Build para producción

```bash
pnpm --filter @futboljoven/shared build
pnpm --filter @futboljoven/api build      # dist/ compilado con tsc
pnpm --filter @futboljoven/web build      # build de Next.js
```

Notas de deploy:
- El backend necesita `DATABASE_URL` apuntando a PostgreSQL, y los secretos JWT vía variables de entorno (nunca hardcodeados).
- El frontend necesita `NEXT_PUBLIC_API_URL` apuntando a la URL pública de la API, y la API necesita `WEB_ORIGIN` apuntando al dominio del frontend para que CORS + cookies funcionen.
- Fotos de jugador: hoy no hay endpoint de upload implementado; el campo `Player.photoUrl` y la arquitectura (`UPLOADS_DIR` en `.env`) están preparados para agregar un `StorageAdapter` (local en dev, S3-compatible en producción) en la siguiente fase.

## Deploy: Vercel (frontend) + Railway (backend + Postgres)

Se eligió esta combinación en vez de "todo en Vercel" porque Vercel corre funciones *serverless* sin estado — no puede sostener un proceso NestJS persistente ni una base de datos con archivo (SQLite). Railway sí: proceso Node siempre activo + PostgreSQL gestionada, con capa gratuita/muy económica para un club chico.

**Por qué existe `apps/api/prisma/schema.production.prisma`**: Prisma no permite que el `provider` del datasource sea dinámico por variable de entorno (solo la `url` sí) — por eso hay dos archivos de schema idénticos salvo el provider: `schema.prisma` (`sqlite`, desarrollo local, cero configuración) y `schema.production.prisma` (`postgresql`, usado únicamente en el build de producción vía `infra/Dockerfile.api`). Si cambiás el modelo de datos, replicá el cambio en ambos archivos.

### Backend en Railway

1. [railway.app](https://railway.app) → "Login with GitHub" (misma cuenta que ya usás en GitHub) — la primera vez que conectás un repo privado, Railway pide autorizar su GitHub App; si el botón de "Configure GitHub App" no aparece en el flujo normal, hacelo desde el propio dashboard de Railway ("+ New" → "GitHub Repo"), no desde `github.com/settings/installations` directamente.
2. Dentro del proyecto: el servicio que apunta al repo → **Settings → Build**: `Builder` = **Dockerfile**, `Dockerfile Path` = `infra/Dockerfile.api`. **Settings → Deploy**: dejá `Custom Start Command` **vacío** (si Railway auto-detectó el monorepo antes de que existiera el Dockerfile, puede haber quedado un start command tipo `pnpm run start` pisando el `CMD` de la imagen).
3. "New" → "Database" → "Add PostgreSQL" dentro del mismo proyecto.
4. Variables de entorno del servicio backend:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_ACCESS_SECRET=<string aleatorio largo, distinto del de dev>
   JWT_REFRESH_SECRET=<otro string aleatorio largo>
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=7d
   WEB_ORIGIN=https://<tu-dominio-de-vercel>.vercel.app   # tiene que ser EXACTO — CORS falla en silencio si no coincide
   NODE_ENV=production
   ```
5. Deploy. El contenedor corre `prisma db push` (crea el schema en la Postgres vacía), después `prisma/bootstrap.ts` (roles/permisos/categorías/temporadas/equipos/usuarios de staff — sin jugadores) y recién ahí levanta el servidor. Generá el dominio público desde **Settings → Networking → Generate Domain**.
6. Para cargar el plantel real en esta base nueva: entrá a `/import-export` en el frontend ya deployado (apuntando a esta API) con el usuario admin y subí el Excel del plantel — es la misma vía que se usó la primera vez, no hace falta ningún script aparte.

### Frontend en Vercel

`vercel.json` vive en la **raíz del repo** (no en `apps/web`) — Vercel tiene que subir el monorepo completo, no solo la subcarpeta, para poder construir `packages/shared` primero. Desde la raíz:

```bash
vercel link --project futboljoven   # conecta la carpeta a un proyecto de Vercel (crea uno nuevo si no existe; el nombre debe ir en minúsculas)
vercel env add NEXT_PUBLIC_API_URL production   # pegá la URL pública de Railway del paso anterior
vercel --prod
```

Notas:
- El preflight de detección de framework de Vercel revisa el `package.json` del directorio que se sube (la raíz), no el de `apps/web` — por eso el `package.json` raíz tiene `"next"` como devDependency aunque no se use ahí directamente.
- Si el deploy queda protegido por un login de Vercel (redirect a `vercel.com/sso-api`) incluso en el dominio de producción: **Project Settings → Deployment Protection** y desactivá "Vercel Authentication" — no hace falta para una app que ya tiene su propio login.
- `NEXT_PUBLIC_API_URL` se hornea en el build — cambiarla requiere un redeploy (`vercel --prod`), no alcanza con solo actualizar la variable.

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

Ya construido en la Fase 2 (modelo real del club):
- Matriz de evaluación ponderada real, con Nota Final y clasificación de talento (Estatus) calculados sobre umbrales reales.
- Nutrición, físico y lesiones — CRUD completo, permisos separados por dato sensible, pestañas dedicadas en el perfil del jugador.
- Documentación/habilitación de jugadores (checklist real de 18 documentos, incluyendo protocolo de transferencia internacional de menores).
- Dashboard con gráficos reales (barras por categoría, distribución de estatus, tendencia del club, jugadores destacados/en seguimiento).
- Taxonomía real de posiciones y género de jugador.
- Import/Export de Excel para jugadores (plantilla descargable, vista previa con validación de duplicados/errores, confirmación explícita, exportación con el mismo scoping por rol) — usado para cargar los 194 jugadores reales del club.

Ya construido en la Fase 3 (identidad visual + Fixture + Financiero + PDF):
- Rebranding visual completo a la identidad de Club Deportes Limache (colores, tipografía, componentes), responsive.
- Dashboard: Promedio de Nota Final, Promedio de IMC, Promedio de altura, conteo Apto/En Reintegro/No Apto.
- Fixture (partidos, staff del día, resultado, tarjetas) y pestaña "Minutos y Partidos" en el perfil del jugador.
- Financiero: ledger de ingresos/gastos con balance mensual.
- Informes PDF firmados (ficha de jugador y reporte de categoría/equipo) con huella de auditoría de quién los generó.

Pendiente (schema ya migrado, sin UI/lógica):
- Import/Export de Excel para evaluaciones, nutrición y otros módulos (hoy solo existe para jugadores).
- Comparación entre jugadores y entre categorías, analítica avanzada adicional.
- Notificaciones (modelo `Notification` listo, sin canal de envío real).
- App móvil (Expo) consumiendo la misma API, con soporte offline.
- Hooks de IA para resúmenes/detección de tendencias (asistencia, nunca reemplazo del criterio del cuerpo técnico).
- Carta Gantt anual de planificación operativa (dominio distinto al de seguimiento de jugadores).
