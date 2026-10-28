import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function databaseUrl(database: string) {
  const user = encodeURIComponent(env("PGUSER"));
  const password = encodeURIComponent(env("PGPASSWORD"));
  const host = env("PGHOST");
  const port = env("PGPORT");
  const name = encodeURIComponent(database);
  const ssl = process.env.PGSSLMODE === "require" ? "&sslmode=require" : "";

  return `postgresql://${user}:${password}@${host}:${port}/${name}?schema=public${ssl}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(env("PGDATABASE")),
    ...(process.env.PGSHADOWDATABASE
      ? {
          shadowDatabaseUrl: databaseUrl(
            process.env.PGSHADOWDATABASE,
          ),
        }
      : {}),
  },
});