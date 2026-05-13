import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'


export const books = pgTable('books', {
  id: serial('id').primaryKey(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bookSegments = pgTable(
  'book_segments',
  {
    id: serial('id').primaryKey(),
    clerkId: text('clerk_id').notNull(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    content: text('content').notNull(),
    segmentIndex: integer('segment_index').notNull(),
    pageNumber: integer('page_number'),
    wordCount: integer('word_count').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('book_segment_unique_idx').on(t.bookId, t.segmentIndex),
    index('book_page_idx').on(t.bookId, t.pageNumber),
    index('book_segment_book_idx').on(t.bookId),
  ],
)

