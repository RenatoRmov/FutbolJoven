import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { fakerES as faker } from "@faker-js/faker";
import {
  ALL_PERMISSIONS,
  DEFAULT_DIMENSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_SCALE,
  PERMISSIONS,
  SYSTEM_ROLES,
} from "@futboljoven/shared";

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
  [PERMISSIONS.REPORTS_GENERATE]: "Generar informes",
  [PERMISSIONS.DATA_EXPORT]: "Exportar información a Excel",
  [PERMISSIONS.DATA_IMPORT]: "Importar información masivamente",
};

const CATEGORY_DEFS = [
  { name: "Sub-13", order: 1, minAge: 12, maxAge: 13 },
  { name: "Sub-14", order: 2, minAge: 13, maxAge: 14 },
  { name: "Sub-15", order: 3, minAge: 14, maxAge: 15 },
  { name: "Sub-16", order: 4, minAge: 15, maxAge: 16 },
  { name: "Sub-17", order: 5, minAge: 16, maxAge: 17 },
  { name: "Sub-18", order: 6, minAge: 17, maxAge: 18 },
  { name: "Proyección / Reserva", order: 7, minAge: 18, maxAge: 21 },
  { name: "Primer Equipo", order: 8, minAge: 17, maxAge: 40 },
];

const POSITIONS = [
  "GOALKEEPER",
  "CENTER_BACK",
  "FULL_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRAL_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "WINGER",
  "STRIKER",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function main() {
  console.log("Seeding FutbolJoven demo data...");

  // --- Club ---
  const club = await prisma.club.upsert({
    where: { id: "00000000-0000-0000-0000-000000000000" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000000", name: "Club Atlético FutbolJoven (DEMO)" },
  });

  // --- Permissions ---
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] ?? key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] ?? key },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  // --- Roles ---
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

  // --- Evaluation scale + dimensions + metrics ---
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

  const dimensionByKey = new Map<string, { id: string }>();
  for (const dim of DEFAULT_DIMENSIONS) {
    const dimension = await prisma.evaluationDimension.upsert({
      where: { key: dim.key },
      update: { name: dim.name, order: dim.order, scaleId: scale.id },
      create: { key: dim.key, name: dim.name, order: dim.order, scaleId: scale.id },
    });
    dimensionByKey.set(dim.key, dimension);

    const existingMetrics = await prisma.evaluationMetric.count({ where: { dimensionId: dimension.id } });
    if (existingMetrics === 0) {
      await prisma.evaluationMetric.createMany({
        data: dim.metrics.map((name, i) => ({ dimensionId: dimension.id, name, order: i })),
      });
    }
  }
  const dimensions = Array.from(dimensionByKey.values());

  // --- Seasons ---
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

  // --- Categories ---
  const categories = [];
  for (const def of CATEGORY_DEFS) {
    const category = await prisma.category.upsert({
      where: { name: def.name },
      update: { order: def.order, minAge: def.minAge, maxAge: def.maxAge },
      create: def,
    });
    categories.push(category);
  }

  // --- Teams (one per category per season) ---
  const teams2026 = new Map<string, { id: string; categoryId: string }>();
  const teams2025 = new Map<string, { id: string; categoryId: string }>();
  for (const category of categories) {
    const team2026 = await prisma.team.upsert({
      where: { categoryId_seasonId: { categoryId: category.id, seasonId: season2026.id } },
      update: {},
      create: { name: `${category.name} 2026`, categoryId: category.id, seasonId: season2026.id },
    });
    teams2026.set(category.id, team2026);

    const team2025 = await prisma.team.upsert({
      where: { categoryId_seasonId: { categoryId: category.id, seasonId: season2025.id } },
      update: {},
      create: { name: `${category.name} 2025`, categoryId: category.id, seasonId: season2025.id },
    });
    teams2025.set(category.id, team2025);
  }

  // --- Users ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  async function upsertUser(email: string, firstName: string, lastName: string, roleKey: string) {
    const role = roleByKey.get(roleKey)!;
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, firstName, lastName, passwordHash, roleId: role.id, isDemo: true },
    });
  }

  const admin = await upsertUser("admin@futboljoven.demo", "Ana", "Administradora", "SUPER_ADMIN");
  await upsertUser("director@futboljoven.demo", "Diego", "Director", "DIRECTOR");
  await upsertUser("coordinador@futboljoven.demo", "Carla", "Coordinadora", "COORDINATOR");
  await upsertUser("nutricion@futboljoven.demo", "Nadia", "Nutricionista", "NUTRITIONIST");
  await upsertUser("fisico@futboljoven.demo", "Franco", "Preparador", "PHYSICAL_TRAINER");
  await upsertUser("scout@futboljoven.demo", "Sofía", "Scout", "SCOUT");

  const coachFirstNames = ["Martín", "Lucía", "Pablo", "Julieta", "Ricardo", "Valentina"];
  const coaches: { id: string }[] = [];
  for (let i = 0; i < categories.length; i++) {
    // Pair up categories so ~4-5 coaches cover 8 categories (matches how a
    // real formative-football staff is usually organized).
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

  const coachByCategoryId = new Map<string, { id: string }>();
  categories.forEach((category, i) => {
    const coach = coaches[Math.floor(i / 2)];
    coachByCategoryId.set(category.id, coach);
  });

  for (const category of categories) {
    const coach = coachByCategoryId.get(category.id)!;
    const team = teams2026.get(category.id)!;
    await prisma.userTeamAssignment.upsert({
      where: { userId_teamId: { userId: coach.id, teamId: team.id } },
      update: {},
      create: { userId: coach.id, teamId: team.id },
    });
  }

  // --- Players + history + evaluations ---
  const playersPerCategory = 15;
  const evaluationTypes = ["MATCH", "MATCH", "MATCH", "TRAINING", "PERIOD"];
  let totalPlayers = 0;
  let totalEvaluations = 0;

  for (const category of categories) {
    const team2026 = teams2026.get(category.id)!;
    const team2025 = teams2025.get(category.id)!;
    const previousCategory = categories.find((c) => c.order === category.order - 1);
    const team2025Previous = previousCategory ? teams2025.get(previousCategory.id) : undefined;
    const coach = coachByCategoryId.get(category.id)!;

    for (let i = 0; i < playersPerCategory; i++) {
      const age = randomInt(category.minAge ?? 13, category.maxAge ?? 18);
      const birthYear = 2026 - age;
      const birthDate = new Date(birthYear, randomInt(0, 11), randomInt(1, 28));

      const cameFromLowerCategory = team2025Previous && Math.random() < 0.4;
      const joinDate = cameFromLowerCategory
        ? new Date("2025-02-15")
        : new Date(2025 + randomInt(0, 1), randomInt(0, 11), randomInt(1, 28));

      const firstName = faker.person.firstName();
      const lastName = `${faker.person.lastName()} ${faker.person.lastName()}`;
      const status = Math.random() < 0.9 ? "ACTIVE" : pick(["INJURED", "INACTIVE"]);

      const player = await prisma.player.create({
        data: {
          firstName,
          lastName,
          birthDate,
          nationality: "Argentina",
          country: "Argentina",
          city: pick(["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"]),
          joinDate,
          currentTeamId: team2026.id,
          jerseyNumber: randomInt(1, 35),
          primaryPosition: pick(POSITIONS),
          dominantFoot: Math.random() < 0.75 ? "RIGHT" : Math.random() < 0.5 ? "LEFT" : "BOTH",
          height: Math.round((150 + (age - 12) * 6 + randomInt(-5, 5)) * 10) / 10,
          weight: Math.round((45 + (age - 12) * 4 + randomInt(-4, 4)) * 10) / 10,
          status,
          isDemo: true,
          notes: "Jugador de demostración generado automáticamente.",
        },
      });
      totalPlayers++;

      if (cameFromLowerCategory && team2025Previous) {
        await prisma.playerTeamHistory.create({
          data: {
            playerId: player.id,
            teamId: team2025Previous.id,
            startDate: new Date("2025-02-15"),
            endDate: new Date("2025-12-15"),
          },
        });
        await prisma.playerTeamHistory.create({
          data: { playerId: player.id, teamId: team2026.id, startDate: new Date("2026-02-01"), endDate: null },
        });
      } else {
        await prisma.playerTeamHistory.create({
          data: { playerId: player.id, teamId: team2026.id, startDate: joinDate, endDate: null },
        });
      }

      // Evaluation history: a handful of sessions over the last months with
      // a gentle overall upward trend + noise, so evolution charts have
      // something real to show.
      const evaluationCount = randomInt(4, 8);
      const baseline: Record<string, number> = {};
      for (const dim of dimensions) baseline[dim.id] = randomInt(4, 7);

      const now = new Date("2026-08-08");
      for (let e = 0; e < evaluationCount; e++) {
        const daysAgo = (evaluationCount - e) * randomInt(12, 22);
        const date = new Date(now.getTime() - daysAgo * 86_400_000);
        if (date < season2026.startDate) continue;

        const evaluation = await prisma.evaluation.create({
          data: {
            playerId: player.id,
            teamId: team2026.id,
            seasonId: season2026.id,
            evaluatorId: coach.id,
            date,
            type: pick(evaluationTypes),
            context: pick(["vs. Club Rival", "vs. Deportivo Central", "Entrenamiento semanal", "Período mensual"]),
            observation: e === evaluationCount - 1 ? "Buena evolución general, mantiene el compromiso en los entrenamientos." : null,
            isDemo: true,
            scores: {
              create: dimensions.map((dim) => {
                const drift = (e / Math.max(evaluationCount - 1, 1)) * randomInt(1, 3);
                const noise = (Math.random() - 0.5) * 1.5;
                const value = Math.round(clamp(baseline[dim.id] + drift + noise, 1, 10) * 2) / 2;
                return { dimensionId: dim.id, value };
              }),
            },
          },
        });
        totalEvaluations++;
        void evaluation;
      }
    }
  }

  console.log(`Seed complete: ${totalPlayers} players, ${totalEvaluations} evaluations.`);
  console.log("Demo login: admin@futboljoven.demo / " + DEMO_PASSWORD);
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
