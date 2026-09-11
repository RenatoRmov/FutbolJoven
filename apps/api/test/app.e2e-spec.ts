import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import cookieParser from "cookie-parser";
import * as bcrypt from "bcryptjs";
import * as ExcelJS from "exceljs";
import { ALL_PERMISSIONS, PERMISSIONS, PLAYER_IMPORT_COLUMNS } from "@futboljoven/shared";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

async function buildImportXlsx(rows: Record<string, string>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Jugadores");
  sheet.columns = PLAYER_IMPORT_COLUMNS.map((c) => ({ header: c.label, key: c.key }));
  sheet.addRow(Object.fromEntries(PLAYER_IMPORT_COLUMNS.map((c) => [c.key, c.example]))); // example row, skipped by the parser
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("FutbolJoven API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie: string;
  let coachCookie: string;
  let nutritionistCookie: string;
  let physicalTrainerCookie: string;

  let teamAId: string;
  let teamBId: string;
  let categoryAId: string;
  let playerAId: string;
  let dimensionId: string;
  let physicalDimensionId: string;
  let performanceDimensionId: string;

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
      PERMISSIONS.FIXTURES_VIEW_ASSIGNED,
      PERMISSIONS.FIXTURES_MANAGE_ASSIGNED,
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
    categoryAId = categoryA.id;

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
    const performanceDimension = await prisma.evaluationDimension.create({
      data: { key: "performance", name: "Rendimiento / Minutos", order: 3, weight: 0.2, scaleId: scale.id },
    });
    performanceDimensionId = performanceDimension.id;

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
      expect(res.body.match.radar[0].value).toBe(8);
      expect(res.body.match.previousRadar[0].value).toBe(6);
      expect(res.body.training.radar[0].value).toBeNull();
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

  describe("Import/Export", () => {
    it("blocks a coach without data.import from previewing an import file", async () => {
      const buffer = await buildImportXlsx([]);
      const res = await request(app.getHttpServer())
        .post("/api/import/players/preview")
        .set("Cookie", coachCookie)
        .attach("file", buffer, "jugadores.xlsx");
      expect(res.status).toBe(403);
    });

    it("flags a row with an unknown category as an error", async () => {
      const buffer = await buildImportXlsx([
        { documentId: "11111111-1", firstName: "Test", lastName: "Uno", birthDate: "2011-01-01", category: "Categoría Inexistente" },
      ]);
      const res = await request(app.getHttpServer())
        .post("/api/import/players/preview")
        .set("Cookie", adminCookie)
        .attach("file", buffer, "jugadores.xlsx");
      expect(res.status).toBe(201);
      expect(res.body.summary.errors).toBe(1);
      expect(res.body.rows[0].outcome).toBe("error");
    });

    it("previews, confirms, and re-detects the same player as an update on a second import", async () => {
      const rut = "22222222-2";
      const buffer = await buildImportXlsx([
        { documentId: rut, firstName: "Importado", lastName: "DePrueba", birthDate: "2011-05-05", category: "Test Sub-15" },
      ]);

      const previewRes = await request(app.getHttpServer())
        .post("/api/import/players/preview")
        .set("Cookie", adminCookie)
        .attach("file", buffer, "jugadores.xlsx");
      expect(previewRes.status).toBe(201);
      expect(previewRes.body.summary).toMatchObject({ toCreate: 1, toUpdate: 0, errors: 0 });

      const confirmRes = await request(app.getHttpServer())
        .post("/api/import/players/confirm")
        .set("Cookie", adminCookie)
        .send({ rows: previewRes.body.rows });
      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body).toMatchObject({ imported: 1, updated: 0 });

      const secondPreview = await request(app.getHttpServer())
        .post("/api/import/players/preview")
        .set("Cookie", adminCookie)
        .attach("file", buffer, "jugadores.xlsx");
      expect(secondPreview.body.summary).toMatchObject({ toCreate: 0, toUpdate: 1, errors: 0 });
    });

    it("lets an admin export players to xlsx", async () => {
      const res = await request(app.getHttpServer()).get("/api/export/players").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });

  describe("Fixtures scoping", () => {
    it("lets a coach create a match for their own team", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival FC", date: "2026-10-01" });
      expect(res.status).toBe(201);
      expect(res.body.teamId).toBe(teamAId);
    });

    it("blocks a coach from creating a match for a team they aren't assigned to", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamBId, opponent: "Rival FC", date: "2026-10-01" });
      expect(res.status).toBe(403);
    });

    it("lets an admin create a match for any team", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", adminCookie)
        .send({ teamId: teamBId, opponent: "Rival FC", date: "2026-10-01" });
      expect(res.status).toBe(201);
    });

    it("records a match result with per-player appearances", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Otro Rival", date: "2026-10-08" });
      const matchId = createRes.body.id;

      const resultRes = await request(app.getHttpServer())
        .post(`/api/fixtures/${matchId}/result`)
        .set("Cookie", coachCookie)
        .send({ teamScore: 2, opponentScore: 1, appearances: [{ playerId: playerAId, started: true, minutesPlayed: 90, goals: 1, yellowCards: 1 }] });
      expect(resultRes.status).toBe(201);
      expect(resultRes.body.status).toBe("PLAYED");

      const appearancesRes = await request(app.getHttpServer())
        .get(`/api/fixtures/player/${playerAId}/appearances`)
        .set("Cookie", coachCookie);
      expect(appearancesRes.status).toBe(200);
      expect(appearancesRes.body.some((a: any) => a.matchId === matchId)).toBe(true);
    });
  });

  describe("Finance permission gating", () => {
    it("blocks a coach (no finance permission) from viewing finance", async () => {
      const res = await request(app.getHttpServer()).get("/api/finance").set("Cookie", coachCookie);
      expect(res.status).toBe(403);
    });

    it("blocks a coach from creating a financial entry", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/finance")
        .set("Cookie", coachCookie)
        .send({ date: "2026-10-01", type: "EXPENSE", category: "Arriendo cancha", amount: 50000 });
      expect(res.status).toBe(403);
    });

    it("lets an admin create and list a financial entry", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/finance")
        .set("Cookie", adminCookie)
        .send({ date: "2026-10-01", type: "INCOME", category: "Cuotas de socios", amount: 100000 });
      expect(createRes.status).toBe(201);

      const listRes = await request(app.getHttpServer()).get("/api/finance").set("Cookie", adminCookie);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThan(0);

      const summaryRes = await request(app.getHttpServer()).get("/api/finance/summary").set("Cookie", adminCookie);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.totalIncome).toBeGreaterThanOrEqual(100000);
    });
  });

  describe("Reports (PDF)", () => {
    it("generates a player PDF report", async () => {
      const res = await request(app.getHttpServer()).get(`/api/reports/players/${playerAId}/pdf`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(Buffer.isBuffer(res.body) || res.body instanceof Uint8Array).toBe(true);
    });

    it("generates a team PDF report", async () => {
      const res = await request(app.getHttpServer()).get(`/api/reports/teams/${teamAId}/pdf`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    });

    it("blocks a coach from exporting a report for a team they aren't assigned to", async () => {
      const res = await request(app.getHttpServer()).get(`/api/reports/teams/${teamBId}/pdf`).set("Cookie", coachCookie);
      expect(res.status).toBe(403);
    });
  });

  describe("Fase 4 — Ficha del Jugador, posiciones, lesiones, rendimiento físico", () => {
    it("creates a player with the new Ficha del Jugador fields and the new grouped position taxonomy", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/players")
        .set("Cookie", adminCookie)
        .send({
          firstName: "Ficha",
          lastName: "Completa",
          birthDate: "2011-02-02",
          joinDate: "2026-01-01",
          teamId: teamAId,
          primaryPosition: "DEFENSA_CENTRAL_DERECHO",
          phone: "+56911111111",
          email: "ficha.completa@test.local",
          address: "Calle Falsa 123",
          healthSystem: "ISAPRE",
          isapreName: "Test Isapre",
          allergies: "Ninguna",
          bloodType: "O+",
          emergencyContactName: "Contacto Emergencia",
          emergencyContactRelationship: "Madre",
          emergencyContactPhone: "+56922222222",
        });
      expect(res.status).toBe(201);
      expect(res.body.primaryPosition).toBe("DEFENSA_CENTRAL_DERECHO");
      expect(res.body.healthSystem).toBe("ISAPRE");
      expect(res.body.emergencyContactName).toBe("Contacto Emergencia");

      const getRes = await request(app.getHttpServer()).get(`/api/players/${res.body.id}`).set("Cookie", adminCookie);
      expect(getRes.status).toBe(200);
      expect(getRes.body.primaryPosition).toBe("DEFENSA_CENTRAL_DERECHO");
      expect(getRes.body.email).toBe("ficha.completa@test.local");
    });

    it("generates the physical performance PDF as its own separate document", async () => {
      await request(app.getHttpServer())
        .post("/api/physical")
        .set("Cookie", physicalTrainerCookie)
        .send({ playerId: playerAId, date: "2026-05-01", recordType: "PERFORMANCE", metrics: { sj: 30, cmj: 32, vift: 15.5 } });

      const res = await request(app.getHttpServer())
        .get(`/api/reports/players/${playerAId}/physical-performance-pdf`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(Buffer.isBuffer(res.body) || res.body instanceof Uint8Array).toBe(true);
    });

    it("only includes the injury history section in the player PDF once an injury exists", async () => {
      const beforeRes = await request(app.getHttpServer()).get(`/api/reports/players/${playerAId}/pdf`).set("Cookie", adminCookie);
      expect(beforeRes.status).toBe(200);
      const beforeSize = beforeRes.body.length;

      const injuryRes = await request(app.getHttpServer())
        .post("/api/injuries")
        .set("Cookie", physicalTrainerCookie)
        .send({
          playerId: playerAId,
          description: "Esguince de tobillo",
          injuryType: "Esguince",
          bodyPart: "Tobillo",
          date: "2026-05-01",
          severity: "MODERATE",
          responsibleProfessional: "Kinesiólogo Test",
          treatment: "Reposo y kinesiología",
          expectedRecoveryDays: 14,
          actualReturnDate: "2026-05-15",
          status: "CLEARED",
        });
      expect(injuryRes.status).toBe(201);

      const afterRes = await request(app.getHttpServer()).get(`/api/reports/players/${playerAId}/pdf`).set("Cookie", adminCookie);
      expect(afterRes.status).toBe(200);
      // The injury history section adds a bar chart + text block; a compressed PDF with it
      // present is meaningfully larger than the same report without any injuries.
      expect(afterRes.body.length).toBeGreaterThan(beforeSize);
    });
  });

  describe("Fase 5 — Entrenamiento vs Partido, Titular, PDF rediseñado", () => {
    it("reweights the Nota Final for a TRAINING evaluation, excluding the 'performance' dimension", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({
          playerId: playerAId,
          teamId: teamAId,
          date: "2026-06-01",
          type: "TRAINING",
          scores: [
            { dimensionId, value: 8 },
            { dimensionId: physicalDimensionId, value: 6 },
            { dimensionId: performanceDimensionId, value: 10 },
          ],
        });
      expect(res.status).toBe(201);
      // Técnica 8*0.5 + Física 6*0.5 = 7.0 — "Rendimiento" (10) queda excluido, no 9.0.
      expect(res.body.notaFinal).toBe(7);
    });

    it("computes the evolution radar separately for MATCH and TRAINING evaluations", async () => {
      const res = await request(app.getHttpServer()).get(`/api/evaluations/player/${playerAId}/evolution`).set("Cookie", coachCookie);
      expect(res.status).toBe(200);
      expect(res.body.match).toBeDefined();
      expect(res.body.training).toBeDefined();
      // El puntaje de Física en Entrenamiento (6) no debe filtrarse al radar de Partido.
      const trainingPhysical = res.body.training.radar.find((r: any) => r.dimensionKey === "physical");
      expect(trainingPhysical.value).toBe(6);
    });

    it("rejects a match result with more than 11 starting-eleven players", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival Titulares", date: "2026-10-15" });
      const matchId = createRes.body.id;

      const players = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          request(app.getHttpServer())
            .post("/api/players")
            .set("Cookie", adminCookie)
            .send({ firstName: `Titular${i}`, lastName: "Test", birthDate: "2011-01-01", joinDate: "2026-01-01", teamId: teamAId }),
        ),
      );

      const resultRes = await request(app.getHttpServer())
        .post(`/api/fixtures/${matchId}/result`)
        .set("Cookie", coachCookie)
        .send({
          teamScore: 1,
          opponentScore: 0,
          appearances: players.map((p) => ({ playerId: p.body.id, started: true, startingEleven: true, minutesPlayed: 90 })),
        });
      expect(resultRes.status).toBe(400);
    });

    it("accepts a match result with exactly 11 starting-eleven players", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival Once", date: "2026-10-16" });
      const matchId = createRes.body.id;

      const players = await Promise.all(
        Array.from({ length: 11 }, (_, i) =>
          request(app.getHttpServer())
            .post("/api/players")
            .set("Cookie", adminCookie)
            .send({ firstName: `Once${i}`, lastName: "Test", birthDate: "2011-01-01", joinDate: "2026-01-01", teamId: teamAId }),
        ),
      );

      const resultRes = await request(app.getHttpServer())
        .post(`/api/fixtures/${matchId}/result`)
        .set("Cookie", coachCookie)
        .send({
          teamScore: 1,
          opponentScore: 0,
          appearances: players.map((p) => ({ playerId: p.body.id, started: true, startingEleven: true, minutesPlayed: 90 })),
        });
      expect(resultRes.status).toBe(201);
      expect(resultRes.body.appearances.every((a: any) => a.startingEleven)).toBe(true);
    });
  });

  describe("Fase 6 — pulido", () => {
    it("round-trips a date-only field without an off-by-one shift", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({ playerId: playerAId, teamId: teamAId, date: "2026-09-06", type: "MATCH", scores: [{ dimensionId, value: 7 }] });
      expect(res.status).toBe(201);
      expect(String(res.body.date)).toMatch(/^2026-09-06/);
    });

    it("returns the most recently created evaluation first when two share the same date", async () => {
      const shared = { playerId: playerAId, teamId: teamAId, date: "2026-09-05", type: "MATCH" };
      await request(app.getHttpServer()).post("/api/evaluations").set("Cookie", coachCookie).send({ ...shared, scores: [{ dimensionId, value: 5 }], observation: "primera" });
      const second = await request(app.getHttpServer())
        .post("/api/evaluations")
        .set("Cookie", coachCookie)
        .send({ ...shared, scores: [{ dimensionId, value: 9 }], observation: "segunda" });
      expect(second.status).toBe(201);

      const listRes = await request(app.getHttpServer()).get(`/api/evaluations/player/${playerAId}`).set("Cookie", coachCookie);
      expect(listRes.status).toBe(200);
      const sameDateEntries = listRes.body.filter((e: any) => String(e.date).startsWith("2026-09-05"));
      expect(sameDateEntries[0].id).toBe(second.body.id);
    });

    it("saves a single player through the quick-evaluation endpoint", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/evaluations/quick")
        .set("Cookie", coachCookie)
        .send({
          teamId: teamAId,
          date: "2026-09-01",
          type: "TRAINING",
          entries: [{ playerId: playerAId, observation: null, scores: [{ dimensionId, value: 6 }] }],
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ created: 1 });
    });

    describe("Inventory", () => {
      let generalItemId: string;
      let categoryItemId: string;

      it("blocks a coach (no inventory permission) from creating an item", async () => {
        const res = await request(app.getHttpServer()).post("/api/inventory").set("Cookie", coachCookie).send({ name: "Balones", quantity: 10 });
        expect(res.status).toBe(403);
      });

      it("lets an admin create a general item and a category-specific item", async () => {
        const generalRes = await request(app.getHttpServer())
          .post("/api/inventory")
          .set("Cookie", adminCookie)
          .send({ name: "Balones N5", itemType: "Balones", quantity: 20, condition: "Bueno" });
        expect(generalRes.status).toBe(201);
        expect(generalRes.body.categoryId).toBeNull();
        generalItemId = generalRes.body.id;

        const categoryRes = await request(app.getHttpServer())
          .post("/api/inventory")
          .set("Cookie", adminCookie)
          .send({ name: "Petos Sub-15", itemType: "Indumentaria", quantity: 15, condition: "Regular", categoryId: categoryAId });
        expect(categoryRes.status).toBe(201);
        expect(categoryRes.body.categoryId).toBe(categoryAId);
        categoryItemId = categoryRes.body.id;
      });

      it("filtering by category returns both the category item and general items", async () => {
        const res = await request(app.getHttpServer()).get(`/api/inventory?categoryId=${categoryAId}`).set("Cookie", adminCookie);
        expect(res.status).toBe(200);
        const ids = res.body.map((i: any) => i.id);
        expect(ids).toContain(generalItemId);
        expect(ids).toContain(categoryItemId);
      });

      it("updates and deletes an item", async () => {
        const updateRes = await request(app.getHttpServer())
          .patch(`/api/inventory/${generalItemId}`)
          .set("Cookie", adminCookie)
          .send({ quantity: 18 });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.quantity).toBe(18);

        const deleteRes = await request(app.getHttpServer()).delete(`/api/inventory/${categoryItemId}`).set("Cookie", adminCookie);
        expect(deleteRes.status).toBe(200);

        const listRes = await request(app.getHttpServer()).get("/api/inventory").set("Cookie", adminCookie);
        expect(listRes.body.map((i: any) => i.id)).not.toContain(categoryItemId);
      });
    });

    it("includes health/medical fields in the full-field player export", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/export/players?full=true")
        .set("Cookie", adminCookie)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheet = workbook.worksheets[0];
      const headerRow = sheet.getRow(1).values as unknown[];
      expect(headerRow.join(" ")).toContain("Alergias");
      expect(headerRow.join(" ")).toContain("Contacto de emergencia");
    });

    it("generates a per-match PDF report", async () => {
      const matchRes = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival PDF", date: "2026-10-20" });
      const matchId = matchRes.body.id;

      const res = await request(app.getHttpServer()).get(`/api/reports/matches/${matchId}/pdf`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    });

    it("generates a full-fixture PDF report", async () => {
      const res = await request(app.getHttpServer()).get(`/api/reports/teams/${teamAId}/fixture-pdf`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    });

    it("exports evaluations to xlsx by team and by player", async () => {
      const byTeam = await request(app.getHttpServer()).get(`/api/export/evaluations?teamId=${teamAId}`).set("Cookie", adminCookie);
      expect(byTeam.status).toBe(200);
      expect(byTeam.headers["content-type"]).toContain("spreadsheetml");

      const byPlayer = await request(app.getHttpServer()).get(`/api/export/evaluations?playerId=${playerAId}`).set("Cookie", adminCookie);
      expect(byPlayer.status).toBe(200);
      expect(byPlayer.headers["content-type"]).toContain("spreadsheetml");
    });

    it("updates a financial entry via PATCH", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/finance")
        .set("Cookie", adminCookie)
        .send({ date: "2026-09-01", type: "EXPENSE", category: "Viajes", amount: 20000 });
      expect(createRes.status).toBe(201);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/finance/${createRes.body.id}`)
        .set("Cookie", adminCookie)
        .send({ amount: 25000 });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.amount).toBe(25000);
    });

    it("generates the finance PDF report", async () => {
      const res = await request(app.getHttpServer()).get("/api/reports/finance/pdf").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    });
  });

  describe("Fase 6b — resultado editable, PDF Revisión de Peso, IMC del dashboard", () => {
    it("lets a coach re-record a match result to correct a mistake", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival Corrección", date: "2026-10-25" });
      const matchId = createRes.body.id;

      const firstResult = await request(app.getHttpServer())
        .post(`/api/fixtures/${matchId}/result`)
        .set("Cookie", coachCookie)
        .send({ teamScore: 1, opponentScore: 0, appearances: [{ playerId: playerAId, started: true, minutesPlayed: 90, goals: 0, yellowCards: 0 }] });
      expect(firstResult.status).toBe(201);
      expect(firstResult.body.teamScore).toBe(1);

      const correctedResult = await request(app.getHttpServer())
        .post(`/api/fixtures/${matchId}/result`)
        .set("Cookie", coachCookie)
        .send({ teamScore: 3, opponentScore: 2, appearances: [{ playerId: playerAId, started: true, minutesPlayed: 90, goals: 2, yellowCards: 1 }] });
      expect(correctedResult.status).toBe(201);
      expect(correctedResult.body.teamScore).toBe(3);
      expect(correctedResult.body.opponentScore).toBe(2);
      // Re-recording must replace, not accumulate, appearances.
      expect(correctedResult.body.appearances).toHaveLength(1);
      expect(correctedResult.body.appearances[0].goals).toBe(2);

      const getRes = await request(app.getHttpServer()).get(`/api/fixtures/${matchId}`).set("Cookie", coachCookie);
      expect(getRes.body.teamScore).toBe(3);
      expect(getRes.body.appearances).toHaveLength(1);
    });

    it("generates the Revisión de Peso PDF for a player", async () => {
      await request(app.getHttpServer())
        .post("/api/physical")
        .set("Cookie", adminCookie)
        .send({ playerId: playerAId, date: "2026-09-01", recordType: "WEIGHT_CHECK", metrics: { weight: 60, height: 170, age: 15 } });

      const res = await request(app.getHttpServer()).get(`/api/reports/players/${playerAId}/weight-check-pdf`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    });

    it("computes the dashboard's average BMI only from Área Médica (ANTHROPOMETRIC) records, not from Revisión de Peso", async () => {
      await request(app.getHttpServer())
        .post("/api/physical")
        .set("Cookie", adminCookie)
        .send({ playerId: playerAId, date: "2026-09-06", recordType: "ANTHROPOMETRIC", metrics: { weight: 70, height: 175 } });
      // A wildly different WEIGHT_CHECK value that would obviously skew the average if it were wrongly included.
      await request(app.getHttpServer())
        .post("/api/physical")
        .set("Cookie", adminCookie)
        .send({ playerId: playerAId, date: "2026-09-07", recordType: "WEIGHT_CHECK", metrics: { weight: 200, height: 50 } });

      const res = await request(app.getHttpServer()).get("/api/dashboard/summary").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.kpis.avgBmi).toBeCloseTo(70 / (1.75 * 1.75), 1);
    });
  });

  describe("Fase 6c — Inventario: cantidad necesaria/a comprar y export a Excel", () => {
    it("stores and returns neededQuantity and toPurchase independently", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/inventory")
        .set("Cookie", adminCookie)
        .send({ name: "Conos platillo", itemType: "Coordinación", quantity: 0, neededQuantity: 120, toPurchase: 120, condition: null });
      expect(createRes.status).toBe(201);
      expect(createRes.body.neededQuantity).toBe(120);
      expect(createRes.body.toPurchase).toBe(120);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/inventory/${createRes.body.id}`)
        .set("Cookie", adminCookie)
        .send({ quantity: 60, toPurchase: 60 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.quantity).toBe(60);
      expect(updateRes.body.neededQuantity).toBe(120);
      expect(updateRes.body.toPurchase).toBe(60);
    });

    it("exports inventory to xlsx", async () => {
      const res = await request(app.getHttpServer()).get("/api/export/inventory").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });

    it("blocks a coach (no inventory permission) from exporting inventory", async () => {
      const res = await request(app.getHttpServer()).get("/api/export/inventory").set("Cookie", coachCookie);
      expect(res.status).toBe(403);
    });
  });

  describe("Fase 6d — categorías por profesor, campos nuevos de partido, export de fixture por fecha", () => {
    it("lets an admin see every team and category", async () => {
      const teamsRes = await request(app.getHttpServer()).get("/api/teams").set("Cookie", adminCookie);
      expect(teamsRes.status).toBe(200);
      const teamIds = teamsRes.body.map((t: any) => t.id);
      expect(teamIds).toContain(teamAId);
      expect(teamIds).toContain(teamBId);

      const catsRes = await request(app.getHttpServer()).get("/api/categories").set("Cookie", adminCookie);
      expect(catsRes.status).toBe(200);
      expect(catsRes.body.length).toBeGreaterThanOrEqual(2);
    });

    it("restricts a coach with only one assigned team to that team's category, in both /teams and /categories", async () => {
      const teamsRes = await request(app.getHttpServer()).get("/api/teams").set("Cookie", coachCookie);
      expect(teamsRes.status).toBe(200);
      const teamIds = teamsRes.body.map((t: any) => t.id);
      expect(teamIds).toContain(teamAId);
      expect(teamIds).not.toContain(teamBId);

      const catsRes = await request(app.getHttpServer()).get("/api/categories").set("Cookie", coachCookie);
      expect(catsRes.status).toBe(200);
      const catIds = catsRes.body.map((c: any) => c.id);
      expect(catIds).toEqual([categoryAId]);
    });

    it("stores the new Preparador de Arqueros and Coordinador fields on a match", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/fixtures")
        .set("Cookie", coachCookie)
        .send({ teamId: teamAId, opponent: "Rival Staff", date: "2026-11-01", goalkeeperCoachName: "Pedro Arquero", coordinatorName: "Ana Coordinadora" });
      expect(res.status).toBe(201);
      expect(res.body.goalkeeperCoachName).toBe("Pedro Arquero");
      expect(res.body.coordinatorName).toBe("Ana Coordinadora");
    });

    it("exports every match across every category within a date range to xlsx", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/export/fixtures?startDate=2026-01-01&endDate=2026-12-31")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });

    it("rejects a fixture export with an invalid date range", async () => {
      const res = await request(app.getHttpServer()).get("/api/export/fixtures?startDate=not-a-date&endDate=2026-12-31").set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });

    it("lets a coach export the fixture range too, scoped to their own assigned team", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/export/fixtures?startDate=2026-01-01&endDate=2026-12-31")
        .set("Cookie", coachCookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });
});
