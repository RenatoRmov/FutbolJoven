-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NutritionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weight" REAL,
    "height" REAL,
    "bodyFatPercent" REAL,
    "muscleMassPercent" REAL,
    "mealsPerDay" INTEGER,
    "macroBalanceNotes" TEXT,
    "junkFoodFrequency" TEXT,
    "mealScheduleNotes" TEXT,
    "dailyWaterLiters" REAL,
    "postTrainingWeightLossPct" REAL,
    "hydrationColorimetry" TEXT,
    "labResults" TEXT,
    "status" TEXT,
    "observations" TEXT,
    "recommendations" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NutritionRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NutritionRecord" ("bodyFatPercent", "createdAt", "dailyWaterLiters", "date", "height", "hydrationColorimetry", "id", "junkFoodFrequency", "labResults", "macroBalanceNotes", "mealScheduleNotes", "mealsPerDay", "muscleMassPercent", "observations", "playerId", "postTrainingWeightLossPct", "recommendations", "recordedById", "status", "weight") SELECT "bodyFatPercent", "createdAt", "dailyWaterLiters", "date", "height", "hydrationColorimetry", "id", "junkFoodFrequency", "labResults", "macroBalanceNotes", "mealScheduleNotes", "mealsPerDay", "muscleMassPercent", "observations", "playerId", "postTrainingWeightLossPct", "recommendations", "recordedById", "status", "weight" FROM "NutritionRecord";
DROP TABLE "NutritionRecord";
ALTER TABLE "new_NutritionRecord" RENAME TO "NutritionRecord";
CREATE INDEX "NutritionRecord_playerId_date_idx" ON "NutritionRecord"("playerId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
