import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core'

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clerkId: text('clerk_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  author: text('author').notNull(),
  persona: text('persona'),
  fileURL: text('file_url').notNull(),
  fileBlobKey: text('file_blob_key').notNull(),
  coverURL: text('cover_url'),
  coverBlobKey: text('cover_blob_key'),
  fileSize: integer('file_size').notNull(),
  totalSegments: integer('total_segments').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const bookSegments = sqliteTable(
  'book_segments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clerkId: text('clerk_id').notNull(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    content: text('content').notNull(),
    segmentIndex: integer('segment_index').notNull(),
    pageNumber: integer('page_number'),
    wordCount: integer('word_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('book_segment_unique_idx').on(t.bookId, t.segmentIndex),
    index('book_page_idx').on(t.bookId, t.pageNumber),
    index('book_segment_book_idx').on(t.bookId),
  ],
)

export const voiceSessions = sqliteTable(
  'voice_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clerkId: text('clerk_id').notNull(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    startedAt: integer('started_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    billingPeriodStart: integer('billing_period_start', {
      mode: 'timestamp_ms',
    }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('voice_clerk_billing_idx').on(t.clerkId, t.billingPeriodStart),
    index('voice_clerk_idx').on(t.clerkId),
    index('voice_billing_idx').on(t.billingPeriodStart),
  ],
)
