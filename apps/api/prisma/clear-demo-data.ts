import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Removes fictional demo players (and everything that cascades from them —
 * evaluations, nutrition/physical/injury records, documents, team history)
 * once real club data has been imported and the demo roster is no longer
 * needed. Does NOT touch users/roles/categories/teams/seasons/evaluation
 * config — those are real club structure, not demo data.
 */
async function main() {
  const before = await prisma.player.count();
  const demoCount = await prisma.player.count({ where: { isDemo: true } });

  const result = await prisma.player.deleteMany({ where: { isDemo: true } });

  const after = await prisma.player.count();
  console.log(`Jugadores antes: ${before} (demo: ${demoCount})`);
  console.log(`Eliminados: ${result.count}`);
  console.log(`Jugadores después: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
