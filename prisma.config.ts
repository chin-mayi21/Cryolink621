import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
