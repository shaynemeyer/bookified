# Feature Spec: Enable AI Chat on Book Detail Page

## Goal

Wire up `BookChat` so the user can have a real conversation with Claude about the book they uploaded. Responses should be streamed. No new persistence layer — messages are ephemeral per page visit.

---

## Current State

- `components/BookChat.tsx` — UI complete; `handleSend` has a `// TODO` stub that echoes back a fake reply.
- `app/(root)/books/[slug]/page.tsx` — server component that renders `<BookChat bookTitle={book.title} />`. Does not pass `bookId`.
- `lib/db/schema.ts` — `bookSegments` table stores full book text as chunked segments (`content`, `segmentIndex`, `pageNumber`, `wordCount`) keyed by `bookId`.
- `books` table has a `persona` field (free-text author/character voice the user configured at upload time).
- No AI SDK installed yet.

---

## Approach

Use **OpenRouter** via the `openai` npm package pointed at OpenRouter's base URL (`https://openrouter.ai/api/v1`). OpenRouter exposes an OpenAI-compatible API so no custom SDK is needed. A Next.js Route Handler at `app/api/chat/route.ts` fetches the book's text segments from the DB, builds a system prompt, and streams a response back. The client reads the stream and appends chunks to the assistant message in real time.

No vector search — segments are loaded in order up to a token budget. Books are typically small enough that this works within any modern model's context window.

---

## Steps

### 1. Install `openai`

```bash
npm install openai
```

Set `OPENROUTER_API_KEY` in `.env.local`. Optionally set `OPENROUTER_MODEL` (defaults to `anthropic/claude-sonnet-4-6` if absent).

---

### 2. Add `getBookSegments` server action

**File:** `lib/actions/book.actions.ts`

Add a new exported function:

```ts
export const getBookSegments = async (bookId: number, limit = 60) => {
  try {
    const rows = await db
      .select({ content: bookSegments.content, segmentIndex: bookSegments.segmentIndex })
      .from(bookSegments)
      .where(eq(bookSegments.bookId, bookId))
      .orderBy(bookSegments.segmentIndex)
      .limit(limit);

    return { success: true as const, data: rows };
  } catch (e) {
    console.error('Error fetching book segments', e);
    return { success: false as const, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};
```

`limit: 60` covers ~15 000–20 000 words, well within Claude's 200k context window. Adjust if books are longer.

---

### 3. Create the Route Handler

**File:** `app/api/chat/route.ts` (new file)

```ts
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { getBookSegments } from '@/lib/actions/book.actions';
import { db, books } from '@/lib/db';
import { eq } from 'drizzle-orm';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4-6';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { bookId, messages } = await req.json();
  if (!bookId || !Array.isArray(messages)) {
    return new Response('Bad request', { status: 400 });
  }

  const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
  if (!book) return new Response('Not found', { status: 404 });

  const segmentsResult = await getBookSegments(bookId);
  const bookText = segmentsResult.success
    ? segmentsResult.data.map((s) => s.content).join('\n\n')
    : '';

  const systemPrompt = [
    `You are a knowledgeable assistant helping the user discuss the book "${book.title}" by ${book.author}.`,
    book.persona ? `Adopt this persona/voice: ${book.persona}.` : '',
    'Answer questions based on the book content below. If the answer is not in the content, say so honestly.',
    '',
    '--- BOOK CONTENT ---',
    bookText,
  ]
    .filter(Boolean)
    .join('\n');

  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })),
    ],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

---

### 4. Update `BookChat` props and send handler

**File:** `components/BookChat.tsx`

**Prop change:** add `bookId: number`.

```ts
export default function BookChat({ bookTitle, bookId }: { bookTitle: string; bookId: number }) {
```

**Replace the stub `handleSend`:**

```ts
async function handleSend() {
  if (!input.trim() || pending) return;
  const userMsg = input.trim();
  setInput('');
  const updatedMessages = [...messages, { role: 'user' as const, text: userMsg }];
  setMessages(updatedMessages);
  setPending(true);

  const assistantMsg: Message = { role: 'assistant', text: '' };
  setMessages((prev) => [...prev, assistantMsg]);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, messages: updatedMessages }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        text: copy[copy.length - 1].text + chunk,
      };
      return copy;
    });
  }

  setPending(false);
}
```

---

### 5. Pass `bookId` from the page

**File:** `app/(root)/books/[slug]/page.tsx`

Change:

```tsx
<BookChat bookTitle={book.title} />
```

To:

```tsx
<BookChat bookTitle={book.title} bookId={book.id} />
```

---

## File Checklist

| File                               | Action                                             |
| ---------------------------------- | -------------------------------------------------- |
| `lib/actions/book.actions.ts`      | Add `getBookSegments`                              |
| `app/api/chat/route.ts`            | Create — POST Route Handler with streaming         |
| `components/BookChat.tsx`          | Add `bookId` prop, replace stub with stream reader |
| `app/(root)/books/[slug]/page.tsx` | Pass `bookId` to `<BookChat>`                      |
| `.env.local`                       | Add `OPENROUTER_API_KEY` (optionally `OPENROUTER_MODEL`)     |

---

## Out of Scope

- Message persistence across page reloads
- Vector/semantic search over segments
- Rate limiting
- Token counting / dynamic segment truncation
- Error UI for failed fetch (future: show a toast)
