import { createClient } from '@libsql/client'
import { drizzle as sqliteDrizzle } from 'drizzle-orm/libsql'
import { neon } from '@neondatabase/serverless'
import { drizzle as pgDrizzle } from 'drizzle-orm/neon-http'
import * as pgSchema from './schema'
import * as sqliteSchema from './schema.sqlite'

const url = process.env.DATABASE_URL ?? 'file:local.db'
const isPostgres =
  url.startsWith('postgresql://') || url.startsWith('postgres://')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = isPostgres
  ? pgDrizzle(neon(url), { schema: pgSchema })
  : sqliteDrizzle(createClient({ url }), { schema: sqliteSchema })
