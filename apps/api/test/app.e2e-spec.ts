import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import cookieParser from "cookie-parser";
import * as bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, PERMISSIONS } from "@futboljoven/shared";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("FutbolJoven API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie: string;
  let coachCookie: string;
  let nutritionistCookie: string;
  let physicalTrainerCookie: string;

  let teamAId: string;
  let teamBId: string;
  let playerAId: string;
  let dimensionId: string;
  let physicalDimensionId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api");
    await app.init();

    prisma = app.get(PrismaService);
    await seedFixtures();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedFixtures() {
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: key } });
    }
    const allPermissions = await prisma.permission.findMany();

    const adminRole = await prisma.role.create({
      data: {
        key: "TEST_ADMIN",
        name: "Test Admin",
        isSystem: true,
        rolePermissions: { create: allPermissions.map((p) => ({ permissionId: p.id })) },
      },
    });

    const coachPermissionKeys: string[] = [
      PERMISSIONS.PLAYERS_VIEW_ASSIGNED,
      PERMISSIONS.PLAYERS_EDIT_ASSIGNED,
      PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED,
      PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED,
      PERMISSIONS.DASHBOARD_VIEW_ASSIGNED,
    ];
    const coachRole = await prisma.role.create({
      data: {
        key: "TEST_COACH",
        name: "Test Coach",
        isSystem: true,
        rolePermissions: {
          create: allPermissions.filter((p) => coachPermissionKeys.includes(p.key)).map((p) => ({ permissionId: p.id })),
        },
      },
    });

    const club = await prisma.club.create({ data: { name: "Test Club" } });
    const season = await prisma.season.create({
      data: { clubId: club.id, name: "Test Season", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), isActive: true },
    });
    const categoryA = await prisma.category.create({ data: { name: "Test Sub-15", order: 1 } });
    const categoryB = await prisma.category.create({ data: { name: "Test Sub-16", order: 2 } });
    const teamA = await prisma.team.create({ data: { name: "Team A", categoryId: categoryA.id, seasonId: season.id } });
    const teamB = await prisma.team.create({ data: { name: "Team B", categoryId: categoryB.id, seasonId: season.id } });
    teamAId = teamA.id;
    teamBId = teamB.id;

    const passwordHash = await bcrypt.hash("Test1234!", 10);
    await prisma.user.create({
      data: { email: "admin@test.local", passwordHash, firstName: "Admin", lastName: "Test", roleId: adminRole.id },
    });
    const coachUser = await prisma.user.create({
      data: {
        email: "coach@test.local",
        passwordHash,
        firstName: "Coach",
        lastName: "Test",
        roleId: coachRole.id,
        teamAssignments: { create: { teamId: teamA.id } },
      },
    });

    const nutritionRole = await prisma.role.create({
      data: {
        key: "TEST_NUTRITIONIST",
        name: "Test Nutritionist",
        isSystem: true,
        rolePermissions: {
          create: allPermissions
            .filter((p) => [PERMISSIONS.NUTRITION_VIEW, PERMISSIONS.NUTRITION_MANAGE, PERMISSIONS.PLAYERS_VIEW_ALL].includes(p.key as any))
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    const physicalRole = await prisma.role.create({
      data: {
        key: "TEST_PHYSICAL",
        name: "Test Physical Trainer",
        isSystem: true,
        rolePermissions: {
          create: allPermissions
            .filter((p) => [PERMISSIONS.PHYSICAL_VIEW, PERMISSIONS.PHYSICAL_MANAGE, PERMISSIONS.PLAYERS_VIEW_ALL].includes(p.key as any))
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    await prisma.user.create({
      data: { email: "nutrition@test.local", passwordHash, firstName: "Nutri", lastName: "Test", roleId: nutritionRole.id },
    });
    await prisma.user.create({
      data: { email: "physical@test.local", passwordHash, firstName: "Physio", lastName: "Test", roleId: physicalRole.id },
    });

    const playerA = await prisma.player.create({
      data: { firstName: "PlayerA", lastName: "One", birthDate: new Date("2011-01-01"), joinDate: new Date("2026-01-01"), currentTeamId: teamA.id, status: "ACTIVE" },
    });
    playerAId = playerA.id;
    await prisma.player.create({
      data: { firstName: "PlayerB", lastName: "One", birthDate: new Date("2010-01-01"), joinDate: new Date("2026-01-01"), currentTeamId: teamB.id, status: "ACTIVE" },
    });

    const scale = await prisma.evaluationScale.create({
      data: { key: "test-scale", name: "Test Scale", minValue: 1, maxValue: 10, labels: JSON.stringify({}) },
    });
    const dimension = await prisma.evaluationDimension.create({
      data: { key: "technical", name: "Técnica", order: 1, weight: 0.5, scaleId: scale.id },
    });
    dimensionId = dimension.id;
    const physicalDimension = await prisma.evaluationDimension.create({
      data: { key: "physical", name: "Física", order: 2, weight: 0.5, scaleId: scale.id },
    });
    physicalDimensionId = physicalDimension.id;

    void coachUser;
  }

  function extractCookie(res: { headers: Record<string, unknown> }): string {
    const raw = res.headers["set-cookie"] as unknown as string[];
    return raw.map((c) => c.split(";")[0]).join("; ");
  }

  describe("Auth", () => {
    it("rejects login with wrong password", async () => {
      const res = await request(app.getHttpServer()).post("/api/auth/login").send({ email: "admin@test.local", password: "wrong-password" });
      expect(res.status).toBe(401);
    });

    it("logs in with correct credentials and sets httpOnly cookies", async () => {
      const res = await request(app.getHttpServer()).post("/api/auth/login").send({ email: "admin@test.local", password: "Test1234!" });
      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      adminCookie = extractCookie(res);

      const coachRes = await request(app.getHttpServer()).post("/api/auth/login").send({ email: "coach@test.local", password: "Test1234!" });
      expect(coachRes.status).toBe(200);
      coachCookie = extractCookie(coachRes);

      const nutritionRes = await request(app.getHttpServer()).post("/api/auth/login").send({ email: "nutrition@test.local", password: "Test1234!" });
      expect(nutritionRes.status).toBe(200);
      nutritionistCookie = extractCookie(nutritionRes);

      const physicalRes = await request(app.getHttpServer()).post("/api/auth/login").send({ email: "physical@test.local", password: "Test1234!" });
      expect(physicalRes.status).toBe(200);
      physicalTrainerCookie = extractCookie(physicalRes);
    });

    it("rejects requests with no session cookie", async () => {
      const res = await request(app.getHttpServer()).get("/api/players");
      expect(res.status).toBe(401);
    });
  });

  describe("RBAC", () => {
    it("blocks a coach from an admin-only endpoint", async () => {
      const res = await request(app.getHttpServer()).get("/api/roles").set("Cookie", coachCookie);
      expect(res.status).toBe(403);
    });

    it("allows an admin on the same endpoint", async () => {
      const res = await request(app.getHttpServer()).get("/api/roles").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
    });
  });

  describe("Players scoping", () => {
    it("lets admin see players from every team", async () => {
      const res = await request(app.getHttpServer()).get("/api/players").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      const teamIds = new Set(res.body.map((p: any) => p.currentTeamId));
      expect(teamIds.has(teamAId)).toBe(true);
      expect(teamIds.has(teamBId)).toBe(true);
    });

    it("restricts a coach to only their assigned team's players", async () => {
      const res = await request(app.getHttpServer()).get("/api/players").set("Cookie", coachCookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const player of res.body) {
        expect(player.currentTeamId).toBe(teamAId);
      }
    });

    it("forbids a coach from editing a player outside their team", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/players")
        .set("Cookie", adminCookie);
      const playerB = res.body.find((p: any) => p.currentTeamId === teamBId);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/players/${playerB.id}`)
        .set("Cookie", coachCookie)
        .send({ notes: "should not be allowed" });
      expect(updateRes.status).toBe(403);
    });
  });

  describe("Evaluations", () => {
    it("creates an evaluation for a player in the coach's team", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({
          playerId: playerAId,
          teamId: teamAId,
          date: "2026-03-01",
          type: "MATCH",
          scores: [{ dimensionId, value: 6 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.scores).toHaveLength(1);
    });

    it("computes the evolution radar from multiple evaluations", async () => {
      await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({ playerId: playerAId, teamId: teamAId, date: "2026-04-01", type: "MATCH", scores: [{ dimensionId, value: 8 }] });

      const res = await request(app.getHttpServer()).get(`/api/evaluations/player/${playerAId}/evolution`).set("Cookie", coachCookie);
      expect(res.status).toBe(200);
      expect(res.body.radar[0].value).toBe(8);
      expect(res.body.previousRadar[0].value).toBe(6);
    });

    it("blocks a coach from evaluating a player in another team", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({ playerId: playerAId, teamId: teamBId, date: "2026-03-01", type: "MATCH", scores: [{ dimensionId, value: 5 }] });
      expect(res.status).toBe(403);
    });
  });

  describe("Nota Final / Estatus (real club weighted matrix)", () => {
    it("computes a weighted Nota Final and maps it to the correct talent status", async () => {
      // Técnica 8 * 0.5 + Física 6 * 0.5 = 7.0 -> "PROYECTABLE" (>= 6.62, < 8.83)
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({
          playerId: playerAId,
          teamId: teamAId,
          date: "2026-05-01",
          type: "MATCH",
          scores: [
            { dimensionId, value: 8 },
            { dimensionId: physicalDimensionId, value: 6 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.notaFinal).toBe(7);
      expect(res.body.estatus).toBe("PROYECTABLE");
    });

    it("crosses into PROYECTADO once the weighted average passes the 8.83 threshold", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({
          playerId: playerAId,
          teamId: teamAId,
          date: "2026-05-15",
          type: "MATCH",
          scores: [
            { dimensionId, value: 9.5 },
            { dimensionId: physicalDimensionId, value: 9 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.notaFinal).toBe(9.25);
      expect(res.body.estatus).toBe("PROYECTADO");
    });
  });

  describe("Sensitive data separation (nutrition vs. physical)", () => {
    it("lets a nutritionist write nutrition records but not evaluations", async () => {
      const nutritionRes = await request(app.getHttpServer())
        .post("/api/nutrition")
        .set("Cookie", nutritionistCookie)
        .send({ playerId: playerAId, date: "2026-05-01", weight: 60, height: 170 });
      expect(nutritionRes.status).toBe(201);

      const evalRes = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", nutritionistCookie)
        .send({ playerId: playerAId, teamId: teamAId, date: "2026-05-01", type: "MATCH", scores: [{ dimensionId, value: 5 }] });
      expect(evalRes.status).toBe(403);
    });

    it("lets a physical trainer write physical/injury records but not nutrition", async () => {
      const physicalRes = await request(app.getHttpServer())
        .post("/api/physical")
        .set("Cookie", physicalTrainerCookie)
        .send({ playerId: playerAId, date: "2026-05-01", metrics: { velocidad: 8 } });
      expect(physicalRes.status).toBe(201);

      const nutritionRes = await request(app.getHttpServer())
        .post("/api/nutrition")
        .set("Cookie", physicalTrainerCookie)
        .send({ playerId: playerAId, date: "2026-05-01", weight: 60 });
      expect(nutritionRes.status).toBe(403);
    });

    it("blocks a coach from viewing nutrition data entirely", async () => {
      const res = await request(app.getHttpServer()).get(`/api/nutrition/player/${playerAId}`).set("Cookie", coachCookie);
      expect(res.status).toBe(403);
    });
  });
});
