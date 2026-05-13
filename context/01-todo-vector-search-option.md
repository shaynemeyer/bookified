# TODO: Vector / Semantic Segment Search (Option B)

Upgrade the keyword segment search (spec 08) to semantic similarity search using embeddings. Relevant segments are retrieved by meaning, not keyword match — a question about "compound interest" would match a segment that says "money making money" even with no shared words.

**Prerequisite:** spec 08 (keyword search) must be implemented first. This replaces `searchBookSegments` at the call site in `app/api/chat/route.ts` without changing anything else.

---

## What Needs to Happen

### 1. Add `embedding` column to `bookSegments`

**`lib/db/schema.ts` (Postgres)**

```ts
import { vector } from 'drizzle-orm/pg-core'; // requires pgvector extension

// inside bookSegments table definition:
embedding: vector('embedding', { dimensions: 1536 }),
```

Requires the `pgvector` extension enabled on the Postgres database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**`lib/db/schema.sqlite.ts` (SQLite / local dev)**

SQLite has no native vector type. Options:

- Store embeddings as `text` (JSON-serialized float array) and do similarity in JS — acceptable for small books, slow at scale.
- Use a separate vector store (e.g. Turso with vector search, or a dedicated service) for production.
- Gate vector search behind `isPostgres` and fall back to keyword search on SQLite.

Recommended: keep keyword search as the SQLite fallback; only enable vector search when `DATABASE_URL` points to Postgres.

---

### 2. Generate embeddings at upload time

**`app/api/chat/route.ts` or a new `app/api/embed/route.ts`**

After `saveBookSegments` succeeds in `UploadForm.tsx`, trigger embedding generation. This should be a background job (fire-and-forget or a queue) since embedding a full book can take several seconds.

```ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY });

export async function embedSegments(bookId: number) {
  const segments = await getBookSegments(bookId, 9999); // all segments
  for (const seg of segments.data) {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dims, cheap
      input: seg.content,
    });
    const embedding = res.data[0].embedding;
    await db
      .update(bookSegments)
      .set({ embedding })
      .where(eq(bookSegments.segmentIndex, seg.segmentIndex));
  }
}
```

Cost estimate: `text-embedding-3-small` is $0.02 / 1M tokens. A 300-page book ≈ 75 000 tokens ≈ $0.0015 per book.

---

### 3. Add `semanticSearchSegments` server action

**`lib/actions/book.actions.ts`**

```ts
export const semanticSearchSegments = async (
  bookId: number,
  query: string,
  limit = 10,
) => {
  // 1. Embed the query
  const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY });
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const queryEmbedding = res.data[0].embedding;

  // 2. Cosine similarity search via pgvector operator
  // Drizzle doesn't have a built-in cosine op yet — use sql`` tag
  const rows = await db.execute(sql`
    SELECT content, segment_index
    FROM book_segments
    WHERE book_id = ${bookId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `);

  return { success: true as const, data: rows.rows };
};
```

The `<=>` operator is pgvector's cosine distance. Results are the semantically closest segments — no fallback needed since unmatched segments would still return by closest distance.

---

### 4. Update `app/api/chat/route.ts`

Swap `searchBookSegments` for `semanticSearchSegments` (Postgres only):

```ts
const segmentsResult = isPostgres
  ? await semanticSearchSegments(bookId, lastUserMessage)
  : await searchBookSegments(bookId, lastUserMessage); // keyword fallback for SQLite
```

---

## Infrastructure Checklist

| Item                         | Notes                                             |
| ---------------------------- | ------------------------------------------------- |
| `pgvector` extension         | Enable on Neon/Supabase/RDS — one SQL command     |
| `embedding` column migration | `npm run db:push` after schema change             |
| Embedding generation trigger | Fire after `saveBookSegments` in upload flow      |
| `OPENROUTER_API_KEY`         | Already needed for chat; also used for embeddings |
| SQLite fallback              | Keep keyword search for local dev                 |

---

## Decision Points Before Starting

1. **Sync vs async embedding:** Generate embeddings inline during upload (simple, blocks the upload response) or via a background job/queue (better UX, more infra). For a small app, inline is fine initially.
2. **Re-embedding on failure:** If embedding fails mid-book, segments with `embedding IS NULL` need a retry path.
3. **Drizzle pgvector support:** Drizzle ORM added `vector` column type in recent versions — confirm the installed version supports it before starting. The `sql`` tag workaround above avoids this dependency.
