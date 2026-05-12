## Steps

### 1. Install dependencies

```bash
npm install drizzle-orm @libsql/client @neondatabase/serverless
npm install -D drizzle-kit
```

- `drizzle-orm` — core ORM
- `@libsql/client` — libsql SQLite driver (local file)
- `@neondatabase/serverless` — Neon Postgres HTTP driver (edge-compatible)
- `drizzle-kit` — CLI for migrations and schema push

### 2. Create `lib/db/schema.ts`

Define tables mirroring the Mongoose models. Use two dialect-specific schema blocks — the correct one is re-exported based on `DATABASE_URL`.

**books**

- `id` (integer PK autoincrement / serial PK)
- `clerkId` text, not null
- `title` text, not null
- `slug` text, not null, unique
- `author` text, not null
- `persona` text, nullable
- `fileURL` text, not null
- `fileBlobKey` text, not null
- `coverURL` text, nullable
- `coverBlobKey` text, nullable
- `fileSize` integer, not null
- `totalSegments` integer, not null, default 0
- `createdAt` / `updatedAt` timestamps

**book_segments**

- `id` PK
- `clerkId` text, not null
- `bookId` integer FK → books.id, not null, indexed
- `content` text, not null
- `segmentIndex` integer, not null, indexed
- `pageNumber` integer, nullable, indexed
- `wordCount` integer, not null
- `createdAt` / `updatedAt`
- Unique composite index: `(bookId, segmentIndex)`
- Index: `(bookId, pageNumber)`

**voice_sessions**

- `id` PK
- `clerkId` text, not null, indexed
- `bookId` integer FK → books.id, not null
- `startedAt` integer (timestamp ms), not null
- `endedAt` integer, nullable
- `durationSeconds` integer, not null, default 0
- `billingPeriodStart` integer, not null, indexed
- `createdAt` / `updatedAt`
- Composite index: `(clerkId, billingPeriodStart)`

### 3. Create `lib/db/index.ts`

Conditionally create the db client:

```ts
// if DATABASE_URL starts with 'postgresql://' or 'postgres://' → use neon
// otherwise → use libsql SQLite (file:local.db)
```

Export a single `db` instance used across the app.

### 4. Add `drizzle.config.ts` at project root

```ts
import { defineConfig } from 'drizzle-kit';

const isPostgres =
  process.env.DATABASE_URL?.startsWith('postgresql') ||
  process.env.DATABASE_URL?.startsWith('postgres');

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres
    ? { url: process.env.DATABASE_URL! }
    : { url: process.env.DATABASE_URL ?? 'file:local.db' },
});
```

### 5. Update `package.json` scripts

Add:

```json
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:generate": "drizzle-kit generate"
```

### 6. Update `.env.local`

```
# Local SQLite
DATABASE_URL=file:local.db

# Production Neon Postgres — set this in Vercel env vars instead
# DATABASE_URL=postgresql://...neon.tech/...
```

### 7. Update `types.d.ts`

Replace manual Mongoose-style interfaces with Drizzle inferred types:

```ts
import type { InferSelectModel } from 'drizzle-orm';
import type { books, bookSegments, voiceSessions } from '@/lib/db/schema';

export type IBook = InferSelectModel<typeof books>;
export type IBookSegment = InferSelectModel<typeof bookSegments>;
export type IVoiceSession = InferSelectModel<typeof voiceSessions>;
```

---

## Critical files

| File                | Action                                                         |
| ------------------- | -------------------------------------------------------------- |
| `lib/db/schema.ts`  | Create — Drizzle table definitions (both dialects)             |
| `lib/db/index.ts`   | Create — conditional db client (SQLite vs Neon)                |
| `drizzle.config.ts` | Create — drizzle-kit config                                    |
| `types.d.ts`        | Update — replace manual interfaces with Drizzle inferred types |
| `package.json`      | Update — add db:push, db:studio, db:generate scripts           |
| `.env.local`        | Update — add DATABASE_URL                                      |

---

## Verification

1. `npm run db:push` with `DATABASE_URL=file:local.db` → creates `local.db` with all tables
2. `npm run db:studio` → Drizzle Studio opens, tables visible
3. Set `DATABASE_URL` to a Neon connection string and run `db:push` → tables created in Postgres
4. `npm run build` → no TypeScript errors
