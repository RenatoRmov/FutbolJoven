-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "kickoffTime" TEXT,
    "meetingTime" TEXT,
    "venue" TEXT,
    "isHome" BOOLEAN NOT NULL DEFAULT true,
    "coachName" TEXT,
    "physicalTrainerName" TEXT,
    "kineName" TEXT,
    "equipmentManagerName" TEXT,
    "otherStaffNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "teamScore" INTEGER,
    "opponentScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "started" BOOLEAN NOT NULL DEFAULT false,
    "minutesPlayed" INTEGER,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCard" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "MatchAppearance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchAppearance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Match_teamId_date_idx" ON "Match"("teamId", "date");

-- CreateIndex
CREATE INDEX "MatchAppearance_playerId_idx" ON "MatchAppearance"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAppearance_matchId_playerId_key" ON "MatchAppearance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "FinancialEntry_clubId_date_idx" ON "FinancialEntry"("clubId", "date");
