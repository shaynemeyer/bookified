# Feature Spec: Keyword Segment Search (Option A)

## Goal

Replace the bulk segment load in the chat API with a keyword search so only the segments most relevant to the user's question are sent to the LLM. This reduces context noise and keeps prompt size predictable regardless of book length.

---

## Current State

`app/api/chat/route.ts` (spec 06) calls `getBookSegments(bookId, limit = 60)` which returns the first 60 segments in order — roughly 15 000–20 000 words dumped into every prompt unconditionally. For short books this works; for long books it either hits token limits or buries the relevant content.

`lib/db/schema.ts` / `lib/db/schema.sqlite.ts` — `bookSegments.content` is a plain `text` column with no full-text index.

---

## Approach

Add a `searchBookSegments` server action that queries segments using SQL `LIKE` — one `OR` condition per word in the query. Return the top `limit` matches ordered by `segmentIndex` (preserves reading order). If no segments match, fall back to the first `limit` segments so the chat always has some context.

Works for both Postgres and SQLite with no schema changes. Can be upgraded to full-text or vector search later without changing the call site.

---

## Steps

### 1. Add `searchBookSegments` server action

**File:** `lib/actions/book.actions.ts`

```ts
export const searchBookSegments = async (
  bookId: number,
  query: string,
  limit = 10,
) => {
  try {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2); // skip stop-word-length tokens

    // Fall back to first N segments when query is too short to search
    if (words.length === 0) {
      const rows = await db
        .select({ content: bookSegments.content, segmentIndex: bookSegments.segmentIndex })
        .from(bookSegments)
        .where(eq(bookSegments.bookId, bookId))
        .orderBy(bookSegments.segmentIndex)
        .limit(limit);
      return { success: true as const, data: rows };
    }

    const conditions = words.map((w) => like(bookSegments.content, `%${w}%`));

    const rows = await db
      .select({ content: bookSegments.content, segmentIndex: bookSegments.segmentIndex })
      .from(bookSegments)
      .where(and(eq(bookSegments.bookId, bookId), or(...conditions)))
      .orderBy(bookSegments.segmentIndex)
      .limit(limit);

    // Fall back if nothing matched
    if (rows.length === 0) {
      const fallback = await db
        .select({ content: bookSegments.content, segmentIndex: bookSegments.segmentIndex })
        .from(bookSegments)
        .where(eq(bookSegments.bookId, bookId))
        .orderBy(bookSegments.segmentIndex)
        .limit(limit);
      return { success: true as const, data: fallback };
    }

    return { success: true as const, data: rows };
  } catch (e) {
    console.error('Error searching book segments', e);
    return { success: false as const, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};
```

Required imports to add: `and`, `or`, `like` from `drizzle-orm`.

---

### 2. Update the chat Route Handler

**File:** `app/api/chat/route.ts`

Replace the `getBookSegments` call with `searchBookSegments`, passing the user's latest message as the query:

```ts
// before
import { getBookSegments } from '@/lib/actions/book.actions';
// ...
const segmentsResult = await getBookSegments(bookId);

// after
import { searchBookSegments } from '@/lib/actions/book.actions';
// ...
const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.text ?? '';
const segmentsResult = await searchBookSegments(bookId, lastUserMessage);
```

Everything downstream (`bookText` assembly, system prompt) stays the same.

---

## File Checklist

| File                          | Action                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| `lib/actions/book.actions.ts` | Add `searchBookSegments`                                    |
| `app/api/chat/route.ts`       | Swap `getBookSegments` for `searchBookSegments`             |

No schema changes. No UI changes.

---

## Trade-offs

| Pro | Con |
|-----|-----|
| Works today, no infrastructure | LIKE is case-sensitive on SQLite by default (use `lower()` or `LIKE` which SQLite does case-insensitively for ASCII) |
| No token budget surprises | Keyword match misses synonyms and paraphrasing |
| Deterministic, easy to debug | Multi-word queries use OR — a segment matching any one word is returned |
| Fallback keeps chat working even on no-match | Relevance ranking is just "matched or not"; no scoring |

---

## Out of Scope

- Relevance scoring / ranking within matches
- Full-text search indexes (`tsvector` / SQLite FTS5)
- Vector/semantic search (see `context/01-todo-vector-search-option.md`)
- Token counting / dynamic limit adjustment
