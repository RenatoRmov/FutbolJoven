-- AlterTable
ALTER TABLE "NutritionRecord" ADD COLUMN "dailyWaterLiters" REAL;
ALTER TABLE "NutritionRecord" ADD COLUMN "hydrationColorimetry" TEXT;
ALTER TABLE "NutritionRecord" ADD COLUMN "junkFoodFrequency" TEXT;
ALTER TABLE "NutritionRecord" ADD COLUMN "labResults" TEXT;
ALTER TABLE "NutritionRecord" ADD COLUMN "macroBalanceNotes" TEXT;
ALTER TABLE "NutritionRecord" ADD COLUMN "mealScheduleNotes" TEXT;
ALTER TABLE "NutritionRecord" ADD COLUMN "mealsPerDay" INTEGER;
ALTER TABLE "NutritionRecord" ADD COLUMN "postTrainingWeightLossPct" REAL;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "gender" TEXT;

-- CreateTable
CREATE TABLE "Injury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bodyPart" TEXT,
    "date" DATETIME NOT NULL,
    "severity" TEXT,
    "expectedRecoveryDays" INTEGER,
    "actualReturnDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "painLevel" INTEGER,
    "mobilityNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Injury_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Injury_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PlayerDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedDate" DATETIME,
    "expiresDate" DATETIME,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerDocument_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvaluationDimension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scaleId" TEXT NOT NULL,
    CONSTRAINT "EvaluationDimension_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "EvaluationScale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EvaluationDimension" ("id", "isActive", "key", "name", "order", "scaleId") SELECT "id", "isActive", "key", "name", "order", "scaleId" FROM "EvaluationDimension";
DROP TABLE "EvaluationDimension";
ALTER TABLE "new_EvaluationDimension" RENAME TO "EvaluationDimension";
CREATE UNIQUE INDEX "EvaluationDimension_key_key" ON "EvaluationDimension"("key");
CREATE INDEX "EvaluationDimension_scaleId_idx" ON "EvaluationDimension"("scaleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Injury_playerId_date_idx" ON "Injury"("playerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_key_key" ON "DocumentType"("key");

-- CreateIndex
CREATE INDEX "PlayerDocument_playerId_idx" ON "PlayerDocument"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerDocument_playerId_documentTypeId_key" ON "PlayerDocument"("playerId", "documentTypeId");
