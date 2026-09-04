-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PhysicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'ANTHROPOMETRIC',
    "metrics" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhysicalRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhysicalRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PhysicalRecord" ("createdAt", "date", "id", "metrics", "observations", "playerId", "recordedById") SELECT "createdAt", "date", "id", "metrics", "observations", "playerId", "recordedById" FROM "PhysicalRecord";
DROP TABLE "PhysicalRecord";
ALTER TABLE "new_PhysicalRecord" RENAME TO "PhysicalRecord";
CREATE INDEX "PhysicalRecord_playerId_date_idx" ON "PhysicalRecord"("playerId", "date");
CREATE INDEX "PhysicalRecord_playerId_recordType_date_idx" ON "PhysicalRecord"("playerId", "recordType", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
