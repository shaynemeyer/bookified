import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? 'file:local.db'
const isPostgres =
  url.startsWith('postgresql://') || url.startsWith('postgres://')

export default defineConfig({
  schema: isPostgres ? './lib/db/schema.ts' : './lib/db/schema.sqlite.ts',
  out: './lib/db/migrations',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: { url },
})
