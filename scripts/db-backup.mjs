// Dumps the remote Supabase DB (schema + data) into backups/ with a timestamp.
// Run before any risky migration: npm run db:backup
//
// Needs SUPABASE_DB_URL — the "Session pooler" connection string from
// Supabase dashboard → Connect (with your DB password filled in).
// Put it in .env.local (gitignored); this script reads it from there or
// from the environment.
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';

let dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl && existsSync('.env.local')) {
  const match = readFileSync('.env.local', 'utf8').match(/^SUPABASE_DB_URL=(.+)$/m);
  if (match) dbUrl = match[1].trim().replace(/^["']|["']$/g, '');
}
if (!dbUrl) {
  console.error(
    'Missing SUPABASE_DB_URL.\n' +
      'Add this line to .env.local (get the string from Supabase dashboard → Connect → Session pooler):\n' +
      '  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres',
  );
  process.exit(1);
}

// pg_dump may not be on PATH right after install — fall back to the default
// Windows install location.
let pgDump = 'pg_dump';
if (spawnSync(pgDump, ['--version'], { shell: true }).status !== 0) {
  const fallback = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe';
  if (!existsSync(fallback)) {
    console.error('pg_dump not found. Install PostgreSQL client tools first.');
    process.exit(1);
  }
  pgDump = `"${fallback}"`;
}

mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const file = `backups/${stamp}-full.sql`;

// Full dump of the public schema: tables, RLS policies, functions, and data.
execSync(`${pgDump} --dbname="${dbUrl}" --schema=public --no-owner --no-privileges -f ${file}`, {
  stdio: 'inherit',
});
console.log(`Backup written: ${file}`);
