'use server';

import { desc, eq, like, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db, books, bookSegments } from '@/lib/db';
import { generateSlug } from '@/lib/utils';
import { CreateBook, TextSegment } from '@/types';

export const getAllBooks = async (search?: string) => {
  try {
    const where = search
      ? or(like(books.title, `%${search}%`), like(books.author, `%${search}%`))
      : undefined;

    const result = await db
      .select()
      .from(books)
      .where(where)
      .orderBy(desc(books.createdAt));

    return { success: true as const, data: result };
  } catch (e) {
    console.error('Error fetching books', e);
    return { success: false as const, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};

export const checkBookExists = async (title: string) => {
  try {
    const slug = generateSlug(title);

    const book = await db.query.books.findFirst({
      where: eq(books.slug, slug),
    });

    if (book) {
      return { exists: true, book };
    }

    return { exists: false };
  } catch (e) {
    console.error('Error checking book exists', e);
    return {
      exists: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

export const createBook = async (data: CreateBook) => {
  try {
    const { userId } = await auth();

    if (!userId || userId !== data.clerkId) {
      return { success: false, error: 'Unauthorized' };
    }

    const slug = generateSlug(data.title);

    const existingBook = await db.query.books.findFirst({
      where: eq(books.slug, slug),
    });

    if (existingBook) {
      return { success: true, data: existingBook, alreadyExists: true };
    }

    const [book] = await db
      .insert(books)
      .values({ ...data, slug, totalSegments: 0 })
      .returning();

    return { success: true, data: book };
  } catch (e) {
    console.error('Error creating a book', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    const book = await db.query.books.findFirst({
      where: eq(books.slug, slug),
    });

    if (!book) {
      return { success: false as const, error: 'Not found' };
    }

    return { success: true as const, data: book };
  } catch (e) {
    console.error('Error fetching book by slug', e);
    return { success: false as const, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};

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

export const saveBookSegments = async (
  bookId: number,
  clerkId: string,
  segments: TextSegment[],
) => {
  try {
    const segmentsToInsert = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        clerkId,
        bookId,
        content: text,
        segmentIndex,
        pageNumber,
        wordCount,
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx.insert(bookSegments).values(segmentsToInsert);
      await tx
        .update(books)
        .set({ totalSegments: segments.length })
        .where(eq(books.id, bookId));
    });

    return { success: true, data: { segmentsCreated: segments.length } };
  } catch (e) {
    console.error('Error saving book segments', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};
