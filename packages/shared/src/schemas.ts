import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const playerStatusEnum = z.enum(["ACTIVE", "INJURED", "SUSPENDED", "INACTIVE", "LEFT_CLUB"]);
export const dominantFootEnum = z.enum(["LEFT", "RIGHT", "BOTH"]);
export const playerGenderEnum = z.enum(["MALE", "FEMALE"]);
export const playerPositionEnum = z.enum([
  "ARQUERO",
  "LATERAL_DERECHO",
  "LATERAL_IZQUIERDO",
  "DEFENSA_CENTRAL_DERECHO",
  "DEFENSA_CENTRAL_IZQUIERDO",
  "VOLANTE_CENTRAL",
  "VOLANTE_MIXTO",
  "VOLANTE_OFENSIVO",
  "DELANTERO_CENTRO",
  "EXTREMO_DERECHO",
  "EXTREMO_IZQUIERDO",
]);

export const healthSystemEnum = z.enum(["FONASA", "ISAPRE", "OTHER"]);

export const createPlayerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  sportName: z.string().max(80).optional().nullable(),
  birthDate: z.coerce.date(),
  gender: playerGenderEnum.optional().nullable(),
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

  // "Ficha del Jugador" — contacto directo.
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(120).optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),

  // Información de salud.
  healthSystem: healthSystemEnum.optional().nullable(),
  isapreName: z.string().max(120).optional().nullable(),
  fonasaTramo: z.string().max(40).optional().nullable(),

  // Antecedentes médicos.
  allergies: z.string().max(1000).optional().nullable(),
  chronicDiseases: z.string().max(1000).optional().nullable(),
  permanentMedications: z.string().max(1000).optional().nullable(),
  relevantPreviousInjuries: z.string().max(1000).optional().nullable(),
  bloodType: z.string().max(10).optional().nullable(),
  medicalObservations: z.string().max(2000).optional().nullable(),

  // Contacto de emergencia.
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactRelationship: z.string().max(80).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
  emergencyContactPhoneAlt: z.string().max(40).optional().nullable(),
  emergencyContactAddress: z.string().max(300).optional().nullable(),
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

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

export const createNutritionRecordSchema = z.object({
  playerId: z.string().uuid(),
  date: z.coerce.date(),
  weight: z.coerce.number().positive().max(200).optional().nullable(),
  height: z.coerce.number().positive().max(250).optional().nullable(),
  bodyFatPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  muscleMassPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  mealsPerDay: z.coerce.number().int().min(0).max(20).optional().nullable(),
  dailyWaterLiters: z.coerce.number().min(0).max(20).optional().nullable(),
  postTrainingWeightLossPct: z.coerce.number().min(0).max(20).optional().nullable(),
  hydrationColorimetry: z.string().max(60).optional().nullable(),
  macroBalanceNotes: z.string().max(1000).optional().nullable(),
  junkFoodFrequency: z.string().max(200).optional().nullable(),
  mealScheduleNotes: z.string().max(1000).optional().nullable(),
  labResults: z.string().max(2000).optional().nullable(),
  status: z.string().max(60).optional().nullable(),
  observations: z.string().max(2000).optional().nullable(),
  recommendations: z.string().max(2000).optional().nullable(),
});
export type CreateNutritionRecordDto = z.infer<typeof createNutritionRecordSchema>;

// ---------------------------------------------------------------------------
// Physical batteries & injuries
// ---------------------------------------------------------------------------

export const physicalRecordTypeEnum = z.enum(["ANTHROPOMETRIC", "PERFORMANCE", "WEIGHT_CHECK"]);

export const createPhysicalRecordSchema = z.object({
  playerId: z.string().uuid(),
  date: z.coerce.date(),
  recordType: physicalRecordTypeEnum.optional().default("ANTHROPOMETRIC"),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  observations: z.string().max(2000).optional().nullable(),
});
export type CreatePhysicalRecordDto = z.infer<typeof createPhysicalRecordSchema>;

export const injuryStatusEnum = z.enum(["ACTIVE", "RECOVERING", "CLEARED"]);
export const injurySeverityEnum = z.enum(["MILD", "MODERATE", "SEVERE"]);

export const createInjurySchema = z.object({
  playerId: z.string().uuid(),
  description: z.string().min(1).max(300),
  injuryType: z.string().max(150).optional().nullable(),
  bodyPart: z.string().max(100).optional().nullable(),
  date: z.coerce.date(),
  severity: injurySeverityEnum.optional().nullable(),
  responsibleProfessional: z.string().max(150).optional().nullable(),
  treatment: z.string().max(1000).optional().nullable(),
  expectedRecoveryDays: z.coerce.number().int().min(0).max(730).optional().nullable(),
  actualReturnDate: z.coerce.date().optional().nullable(),
  status: injuryStatusEnum.optional().default("ACTIVE"),
  painLevel: z.coerce.number().int().min(0).max(10).optional().nullable(),
  mobilityNotes: z.string().max(1000).optional().nullable(),
});
export type CreateInjuryDto = z.infer<typeof createInjurySchema>;

export const updateInjurySchema = createInjurySchema.partial().omit({ playerId: true });
export type UpdateInjuryDto = z.infer<typeof updateInjurySchema>;

// ---------------------------------------------------------------------------
// Player eligibility / document checklist
// ---------------------------------------------------------------------------

export const documentStatusEnum = z.enum(["PENDING", "SUBMITTED", "EXPIRED", "NOT_APPLICABLE"]);

export const upsertPlayerDocumentSchema = z.object({
  documentTypeId: z.string().uuid(),
  status: documentStatusEnum,
  submittedDate: z.coerce.date().optional().nullable(),
  expiresDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpsertPlayerDocumentDto = z.infer<typeof upsertPlayerDocumentSchema>;

// ---------------------------------------------------------------------------
// Fixture — "Minutos y Partidos"
// ---------------------------------------------------------------------------

export const matchStatusEnum = z.enum(["SCHEDULED", "PLAYED", "POSTPONED", "CANCELLED"]);

export const createMatchSchema = z.object({
  teamId: z.string().uuid(),
  opponent: z.string().min(1).max(120),
  date: z.coerce.date(),
  kickoffTime: z.string().max(20).optional().nullable(),
  meetingTime: z.string().max(20).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  venue: z.string().max(150).optional().nullable(),
  isHome: z.boolean().optional().default(true),
  coachName: z.string().max(150).optional().nullable(),
  physicalTrainerName: z.string().max(150).optional().nullable(),
  kineName: z.string().max(150).optional().nullable(),
  equipmentManagerName: z.string().max(150).optional().nullable(),
  otherStaffNotes: z.string().max(500).optional().nullable(),
  // Traslados / alojamiento — solo relevantes cuando isHome = false.
  techStaffArrivalTime: z.string().max(20).optional().nullable(),
  playersArrivalTime: z.string().max(20).optional().nullable(),
  busDepartureTime: z.string().max(20).optional().nullable(),
  meetingPoint: z.string().max(200).optional().nullable(),
  hotelNameAddress: z.string().max(300).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type CreateMatchDto = z.infer<typeof createMatchSchema>;

export const updateMatchSchema = createMatchSchema.partial().omit({ teamId: true });
export type UpdateMatchDto = z.infer<typeof updateMatchSchema>;

export const matchAppearanceEntrySchema = z.object({
  playerId: z.string().uuid(),
  started: z.boolean().optional().default(false),
  startingEleven: z.boolean().optional().default(false),
  minutesPlayed: z.coerce.number().int().min(0).max(150).optional().nullable(),
  goals: z.coerce.number().int().min(0).max(20).optional().default(0),
  yellowCards: z.coerce.number().int().min(0).max(2).optional().default(0),
  redCard: z.boolean().optional().default(false),
  notes: z.string().max(300).optional().nullable(),
});
export type MatchAppearanceEntryDto = z.infer<typeof matchAppearanceEntrySchema>;

export const recordMatchResultSchema = z.object({
  teamScore: z.coerce.number().int().min(0).max(50),
  opponentScore: z.coerce.number().int().min(0).max(50),
  appearances: z.array(matchAppearanceEntrySchema).min(1),
});
export type RecordMatchResultDto = z.infer<typeof recordMatchResultSchema>;

// ---------------------------------------------------------------------------
// Financiero
// ---------------------------------------------------------------------------

export const financialEntryTypeEnum = z.enum(["INCOME", "EXPENSE"]);

export const createFinancialEntrySchema = z.object({
  date: z.coerce.date(),
  type: financialEntryTypeEnum,
  category: z.string().min(1).max(80),
  amount: z.coerce.number().positive().max(999_999_999),
  description: z.string().max(500).optional().nullable(),
});
export type CreateFinancialEntryDto = z.infer<typeof createFinancialEntrySchema>;

export const inventoryConditionEnum = z.enum(["Bueno", "Regular", "Malo"]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(120),
  itemType: z.string().max(80).optional().nullable(),
  quantity: z.coerce.number().int().min(0).max(999_999),
  neededQuantity: z.coerce.number().int().min(0).max(999_999).optional().nullable(),
  toPurchase: z.coerce.number().int().min(0).max(999_999).optional().nullable(),
  condition: inventoryConditionEnum.optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});
export type CreateInventoryItemDto = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export type UpdateInventoryItemDto = z.infer<typeof updateInventoryItemSchema>;
