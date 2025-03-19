import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configurarea pool-ului de conexiune cu parametri de reziliență
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                     // număr maxim de conexiuni
  idleTimeoutMillis: 30000,    // cât timp o conexiune poate rămâne inactivă (30 secunde)
  connectionTimeoutMillis: 5000, // timeout pentru conectare (5 secunde)
  maxUses: 7500                // recicleaza conexiunea după 7500 de utilizări
});

// Adăugăm gestionarea erorilor pe pool
pool.on('error', (err, client) => {
  console.error('Eroare neașteptată în pool-ul de conexiuni PostgreSQL:', err);
});

// Exportăm instanța drizzle
export const db = drizzle({ client: pool, schema });

// Funcție de verificare a conexiunii
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (error) {
    console.error('Eroare la conectarea la baza de date:', error);
    return false;
  }
}
