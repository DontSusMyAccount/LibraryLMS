import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

export interface DbConnection {
  client: Sql;
  db: PostgresJsDatabase;
}

export function createDatabaseClient(url: string): DbConnection {
  const client = postgres(url, { prepare: false });
  return { client, db: drizzle(client) };
}
