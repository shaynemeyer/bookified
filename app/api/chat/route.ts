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
  if (book.clerkId !== userId) return new Response('Forbidden', { status: 403 });

  const segmentsResult = await getBookSegments(bookId);
  if (!segmentsResult.success) return new Response('Failed to load book content', { status: 500 });
  const bookText = segmentsResult.data.map((s: { content: string }) => s.content).join('\n\n');

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
