import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const playerStatusEnum = z.enum(["ACTIVE", "INJURED", "SUSPENDED", "INACTIVE", "LEFT_CLUB"]);
export const dominantFootEnum = z.enum(["LEFT", "RIGHT", "BOTH"]);
export const playerPositionEnum = z.enum([
  "GOALKEEPER",
  "CENTER_BACK",
  "FULL_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRAL_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "WINGER",
  "STRIKER",
]);

export const createPlayerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  sportName: z.string().max(80).optional().nullable(),
  birthDate: z.coerce.date(),
  nationality: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  documentId: z.string().max(40).optional().nullable(),
  joinDate: z.coerce.date(),
  teamId: z.string().uuid().optional().nullable(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  primaryPosition: playerPositionEnum.optional().nullable(),
  secondaryPositions: z.array(playerPositionEnum).optional().default([]),
  dominantFoot: dominantFootEnum.optional().nullable(),
  height: z.coerce.number().positive().max(250).optional().nullable(),
  weight: z.coerce.number().positive().max(200).optional().nullable(),
  status: playerStatusEnum.optional().default("ACTIVE"),
  notes: z.string().max(4000).optional().nullable(),
});
export type CreatePlayerDto = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = createPlayerSchema.partial().extend({
  exitDate: z.coerce.date().optional().nullable(),
  exitReason: z.string().max(400).optional().nullable(),
});
export type UpdatePlayerDto = z.infer<typeof updatePlayerSchema>;

export const evaluationTypeEnum = z.enum(["MATCH", "TRAINING", "PERIOD"]);

export const createEvaluationScoreSchema = z.object({
  dimensionId: z.string().uuid(),
  metricId: z.string().uuid().optional().nullable(),
  value: z.coerce.number(),
  comment: z.string().max(1000).optional().nullable(),
});

export const createEvaluationSchema = z.object({
  playerId: z.string().uuid(),
  teamId: z.string().uuid(),
  date: z.coerce.date(),
  type: evaluationTypeEnum,
  context: z.string().max(200).optional().nullable(),
  observation: z.string().max(4000).optional().nullable(),
  scores: z.array(createEvaluationScoreSchema).min(1),
});
export type CreateEvaluationDto = z.infer<typeof createEvaluationSchema>;

export const quickEvaluationEntrySchema = z.object({
  teamId: z.string().uuid(),
  date: z.coerce.date(),
  type: evaluationTypeEnum,
  context: z.string().max(200).optional().nullable(),
  entries: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        observation: z.string().max(4000).optional().nullable(),
        scores: z.array(createEvaluationScoreSchema).min(1),
      }),
    )
    .min(1),
});
export type QuickEvaluationEntryDto = z.infer<typeof quickEvaluationEntrySchema>;

export const createSeasonSchema = z.object({
  name: z.string().min(1).max(40),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional().default(false),
});
export type CreateSeasonDto = z.infer<typeof createSeasonSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  order: z.coerce.number().int().min(0),
  minAge: z.coerce.number().int().min(0).max(60).optional().nullable(),
  maxAge: z.coerce.number().int().min(0).max(60).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  categoryId: z.string().uuid(),
  seasonId: z.string().uuid(),
});
export type CreateTeamDto = z.infer<typeof createTeamSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  roleId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
