import { neon } from "@neondatabase/serverless";

let client;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada. Conecte um PostgreSQL/Neon ao projeto no Vercel.");
  }
  if (!client) client = neon(process.env.DATABASE_URL);
  return client;
}
