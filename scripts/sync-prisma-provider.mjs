import fs from "node:fs";
import path from "node:path";

function loadDatabaseUrlFromDotenv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), ".env");
  try {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        return match[1].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env
  }
  return "file:./dev.db";
}

function clearStalePrismaArtifacts() {
  const prismaClientDir = path.join(process.cwd(), "node_modules", ".prisma", "client");
  if (!fs.existsSync(prismaClientDir)) return;

  for (const entry of fs.readdirSync(prismaClientDir, { withFileTypes: true })) {
    const name = entry.name;
    const isStale =
      entry.isFile() &&
      (name.endsWith(".tmp") || name.includes(".tmp") || name.startsWith("query_engine-") || name.startsWith("libquery_engine-"));

    if (!isStale) continue;

    try {
      fs.unlinkSync(path.join(prismaClientDir, name));
    } catch {
      // Windows may briefly keep a stale Prisma binary locked during failed generation.
    }
  }
}

const databaseUrl = loadDatabaseUrlFromDotenv();
const usePostgres = databaseUrl.startsWith("postgres");
clearStalePrismaArtifacts();

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${usePostgres ? "postgresql" : "sqlite"}"`);

if (usePostgres) {
  if (!/binaryTargets\s*=/.test(schema)) {
    schema = schema.replace(
      /provider\s*=\s*"prisma-client-js"/,
      'provider      = "prisma-client-js"\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]'
    );
  }
} else {
  schema = schema.replace(/\n\s*binaryTargets\s*=\s*\[[^\]]*\]/, "");
  schema = schema.replace(/provider\s+=\s+"prisma-client-js"/, 'provider = "prisma-client-js"');
}

fs.writeFileSync(schemaPath, schema);
console.log(`[sync-prisma-provider] ${usePostgres ? "postgresql" : "sqlite"} (${databaseUrl.slice(0, 24)}…)`);
