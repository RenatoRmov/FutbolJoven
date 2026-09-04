import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  ALL_PERMISSIONS,
  DEFAULT_DIMENSIONS,
  DEFAULT_DOCUMENT_TYPES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_SCALE,
  PERMISSIONS,
  SYSTEM_ROLES,
} from "@futboljoven/shared";

/**
 * Production bootstrap — idempotent (every write is an upsert or checked
 * before insert), runs on every container boot (see infra/Dockerfile.api).
 * Creates the club structure and staff accounts needed to actually use
 * the platform: permissions, roles, the real weighted evaluation matrix,
 * the document checklist, seasons/categories/teams, and staff users.
 *
 * Deliberately does NOT create any players — real rosters are loaded via
 * the Import/Export feature (see README "Fase 2b"), never fabricated in
 * production.
 */

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo1234!";

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  DIRECTOR: "Director Deportivo",
  COORDINATOR: "Coordinador de Fútbol Formativo",
  COACH: "Profesor / Entrenador",
  NUTRITIONIST: "Nutricionista",
  PHYSICAL_TRAINER: "Preparador Físico",
  SCOUT: "Scout / Analista",
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.SYSTEM_CONFIGURE]: "Configurar parámetros generales del sistema",
  [PERMISSIONS.USERS_MANAGE]: "Crear, editar y desactivar usuarios",
  [PERMISSIONS.ROLES_MANAGE]: "Crear y editar roles y permisos",
  [PERMISSIONS.SEASONS_MANAGE]: "Crear y editar temporadas",
  [PERMISSIONS.CATEGORIES_MANAGE]: "Crear y editar categorías",
  [PERMISSIONS.TEAMS_MANAGE]: "Crear y editar equipos/plantillas",
  [PERMISSIONS.PLAYERS_VIEW_ALL]: "Ver todos los jugadores del club",
  [PERMISSIONS.PLAYERS_VIEW_ASSIGNED]: "Ver jugadores de los equipos asignados",
  [PERMISSIONS.PLAYERS_CREATE]: "Crear jugadores",
  [PERMISSIONS.PLAYERS_EDIT_ALL]: "Editar cualquier jugador",
  [PERMISSIONS.PLAYERS_EDIT_ASSIGNED]: "Editar jugadores de los equipos asignados",
  [PERMISSIONS.PLAYERS_DELETE]: "Dar de baja jugadores",
  [PERMISSIONS.EVALUATIONS_VIEW_ALL]: "Ver todas las evaluaciones",
  [PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED]: "Ver evaluaciones de los equipos asignados",
  [PERMISSIONS.EVALUATIONS_CREATE_ALL]: "Crear evaluaciones para cualquier equipo",
  [PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED]: "Crear evaluaciones para los equipos asignados",
  [PERMISSIONS.EVALUATIONS_CONFIG_MANAGE]: "Configurar dimensiones, métricas y escalas de evaluación",
  [PERMISSIONS.DASHBOARD_VIEW_GLOBAL]: "Ver el dashboard global del club",
  [PERMISSIONS.DASHBOARD_VIEW_ASSIGNED]: "Ver el dashboard de los equipos asignados",
  [PERMISSIONS.AUDIT_VIEW]: "Ver el registro de auditoría",
  [PERMISSIONS.NUTRITION_VIEW]: "Ver información nutricional",
  [PERMISSIONS.NUTRITION_MANAGE]: "Registrar información nutricional",
  [PERMISSIONS.PHYSICAL_VIEW]: "Ver información física",
  [PERMISSIONS.PHYSICAL_MANAGE]: "Registrar información física",
  [PERMISSIONS.PLAYERS_DOCUMENTS_VIEW]: "Ver documentación/habilitación de jugadores",
  [PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE]: "Gestionar documentación/habilitación de jugadores",
  [PERMISSIONS.REPORTS_GENERATE]: "Generar informes",
  [PERMISSIONS.DATA_EXPORT]: "Exportar información a Excel",
  [PERMISSIONS.DATA_IMPORT]: "Importar información masivamente",
  [PERMISSIONS.FIXTURES_VIEW_ALL]: "Ver el fixture de todos los equipos",
  [PERMISSIONS.FIXTURES_VIEW_ASSIGNED]: "Ver el fixture de los equipos asignados",
  [PERMISSIONS.FIXTURES_MANAGE_ALL]: "Cargar partidos y resultados de cualquier equipo",
  [PERMISSIONS.FIXTURES_MANAGE_ASSIGNED]: "Cargar partidos y resultados de los equipos asignados",
  [PERMISSIONS.FINANCE_VIEW]: "Ver el estado financiero del club",
  [PERMISSIONS.FINANCE_MANAGE]: "Registrar ingresos y gastos del club",
};

const CATEGORY_DEFS = [
  { name: "Sub-13", order: 1, minAge: 12, maxAge: 13, gender: "MALE" as const },
  { name: "Sub-14", order: 2, minAge: 13, maxAge: 14, gender: "MALE" as const },
  { name: "Sub-15", order: 3, minAge: 14, maxAge: 15, gender: "MALE" as const },
  { name: "Sub-16", order: 4, minAge: 15, maxAge: 16, gender: "MALE" as const },
  { name: "Sub-18", order: 5, minAge: 16, maxAge: 18, gender: "MALE" as const },
  { name: "Sub-20", order: 6, minAge: 18, maxAge: 20, gender: "MALE" as const },
  { name: "Femenina Juvenil", order: 7, minAge: 13, maxAge: 21, gender: "FEMALE" as const },
];

// "Primer Equipo" was retired (Fase 4, ítem 1) — never had players in
// production, so deactivating instead of deleting (Team.category is
// onDelete: Restrict) is enough to hide it everywhere without any data risk.
const RETIRED_CATEGORY_NAMES = ["Primer Equipo"];

async function main() {
  console.log("Bootstrapping FutbolJoven production data (no demo players)...");

  await prisma.category.updateMany({ where: { name: { in: RETIRED_CATEGORY_NAMES } }, data: { isActive: false } });

  const club = await prisma.club.upsert({
    where: { id: "00000000-0000-0000-0000-000000000000" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000000", name: "Club Deportes Limache" },
  });

  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] ?? key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] ?? key },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  const roleByKey = new Map<string, { id: string }>();
  for (const roleKey of Object.values(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: {},
      create: { key: roleKey, name: ROLE_NAMES[roleKey], isSystem: true },
    });
    roleByKey.set(roleKey, role);

    const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleKey as keyof typeof DEFAULT_ROLE_PERMISSIONS];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permKey of grantedKeys) {
      const permission = permissionByKey.get(permKey);
      if (!permission) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
  }

  const scale = await prisma.evaluationScale.upsert({
    where: { key: DEFAULT_SCALE.key },
    update: { labels: JSON.stringify(DEFAULT_SCALE.labels) },
    create: {
      key: DEFAULT_SCALE.key,
      name: DEFAULT_SCALE.name,
      minValue: DEFAULT_SCALE.minValue,
      maxValue: DEFAULT_SCALE.maxValue,
      labels: JSON.stringify(DEFAULT_SCALE.labels),
    },
  });

  for (const dim of DEFAULT_DIMENSIONS) {
    const dimension = await prisma.evaluationDimension.upsert({
      where: { key: dim.key },
      update: { name: dim.name, order: dim.order, weight: dim.weight, scaleId: scale.id },
      create: { key: dim.key, name: dim.name, order: dim.order, weight: dim.weight, scaleId: scale.id },
    });

    const existingMetrics = await prisma.evaluationMetric.count({ where: { dimensionId: dimension.id } });
    if (existingMetrics === 0) {
      await prisma.evaluationMetric.createMany({
        data: dim.metrics.map((name, i) => ({ dimensionId: dimension.id, name, order: i })),
      });
    }
  }

  for (const doc of DEFAULT_DOCUMENT_TYPES) {
    await prisma.documentType.upsert({
      where: { key: doc.key },
      update: { name: doc.name, category: doc.category, isRequired: doc.isRequired, order: doc.order },
      create: { key: doc.key, name: doc.name, category: doc.category, isRequired: doc.isRequired, order: doc.order },
    });
  }

  const season2025 = await prisma.season.upsert({
    where: { id: "00000000-0000-0000-0000-000000002025" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000002025",
      clubId: club.id,
      name: "Temporada 2025",
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-12-15"),
      isActive: false,
    },
  });
  const season2026 = await prisma.season.upsert({
    where: { id: "00000000-0000-0000-0000-000000002026" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000002026",
      clubId: club.id,
      name: "Temporada 2026",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-12-15"),
      isActive: true,
    },
  });

  const categories = [];
  for (const def of CATEGORY_DEFS) {
    const category = await prisma.category.upsert({
      where: { name: def.name },
      update: { order: def.order, minAge: def.minAge, maxAge: def.maxAge },
      create: { name: def.name, order: def.order, minAge: def.minAge, maxAge: def.maxAge },
    });
    categories.push(category);
  }

  const teams2026 = new Map<string, { id: string }>();
  for (const category of categories) {
    const team2026 = await prisma.team.upsert({
      where: { categoryId_seasonId: { categoryId: category.id, seasonId: season2026.id } },
      update: {},
      create: { name: `${category.name} 2026`, categoryId: category.id, seasonId: season2026.id },
    });
    teams2026.set(category.id, team2026);
    await prisma.team.upsert({
      where: { categoryId_seasonId: { categoryId: category.id, seasonId: season2025.id } },
      update: {},
      create: { name: `${category.name} 2025`, categoryId: category.id, seasonId: season2025.id },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  async function upsertUser(email: string, firstName: string, lastName: string, roleKey: string) {
    const role = roleByKey.get(roleKey)!;
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, firstName, lastName, passwordHash, roleId: role.id },
    });
  }

  await upsertUser("admin@futboljoven.demo", "Ana", "Administradora", "SUPER_ADMIN");
  await upsertUser("director@futboljoven.demo", "Diego", "Director", "DIRECTOR");
  await upsertUser("coordinador@futboljoven.demo", "Carla", "Coordinadora", "COORDINATOR");
  await upsertUser("nutricion@futboljoven.demo", "Nadia", "Nutricionista", "NUTRITIONIST");
  await upsertUser("fisico@futboljoven.demo", "Franco", "Preparador", "PHYSICAL_TRAINER");
  await upsertUser("scout@futboljoven.demo", "Sofía", "Scout", "SCOUT");

  const coachFirstNames = ["Martín", "Lucía", "Pablo", "Julieta", "Ricardo", "Valentina"];
  const coaches: { id: string }[] = [];
  for (let i = 0; i < categories.length; i++) {
    if (i % 2 === 0) {
      const coach = await upsertUser(
        `coach${i / 2 + 1}@futboljoven.demo`,
        coachFirstNames[(i / 2) % coachFirstNames.length],
        "Entrenador",
        "COACH",
      );
      coaches.push(coach);
    }
  }

  for (let i = 0; i < categories.length; i++) {
    const coach = coaches[Math.floor(i / 2)];
    const team = teams2026.get(categories[i].id)!;
    await prisma.userTeamAssignment.upsert({
      where: { userId_teamId: { userId: coach.id, teamId: team.id } },
      update: {},
      create: { userId: coach.id, teamId: team.id },
    });
  }

  console.log(`Bootstrap complete: ${categories.length} categorías, ${coaches.length + 6} usuarios de staff, 0 jugadores.`);
  console.log("Login: admin@futboljoven.demo / " + DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
