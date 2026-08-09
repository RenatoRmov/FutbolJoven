// Recreates a clean SQLite test database and applies migrations before the
// Jest suite runs, so every run starts from an identical, empty schema.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "prisma", "test.db");
for (const p of [dbPath, `${dbPath}-journal`]) {
  if (fs.existsSync(p)) fs.rmSync(p);
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: "file:./test.db" },
  cwd: path.join(__dirname, ".."),
});
