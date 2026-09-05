-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MatchAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "started" BOOLEAN NOT NULL DEFAULT false,
    "startingEleven" BOOLEAN NOT NULL DEFAULT false,
    "minutesPlayed" INTEGER,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCard" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "MatchAppearance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchAppearance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MatchAppearance" ("goals", "id", "matchId", "minutesPlayed", "notes", "playerId", "redCard", "started", "yellowCards") SELECT "goals", "id", "matchId", "minutesPlayed", "notes", "playerId", "redCard", "started", "yellowCards" FROM "MatchAppearance";
DROP TABLE "MatchAppearance";
ALTER TABLE "new_MatchAppearance" RENAME TO "MatchAppearance";
CREATE INDEX "MatchAppearance_playerId_idx" ON "MatchAppearance"("playerId");
CREATE UNIQUE INDEX "MatchAppearance_matchId_playerId_key" ON "MatchAppearance"("matchId", "playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
