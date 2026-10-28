import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function databaseUrl(database: string) {
  const user = encodeURIComponent(env("PGUSER"));
  const password = encodeURIComponent(env("PGPASSWORD"));
  const host = env("PGHOST");
  const port = env("PGPORT");
  const name = encodeURIComponent(database);

  return `postgresql://${user}:${password}@${host}:${port}/${name}?schema=public`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: databaseUrl(env("PGDATABASE")),
    shadowDatabaseUrl: databaseUrl(env("PGSHADOWDATABASE")),
  },
});