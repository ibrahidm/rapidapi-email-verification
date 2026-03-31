/**
 * Database Migration Runner
 *
 * Runs SQL migrations using postgres.js (no psql required)
 *
 * Usage: pnpm db:migrate
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../db/migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Get all .sql files sorted by name
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Running ${files.length} migration(s)...\n`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const content = readFileSync(filePath, 'utf-8');

      console.log(`> ${file}`);
      await sql.unsafe(content);
      console.log(`  Done\n`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
