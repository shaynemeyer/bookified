import BookCard from '@/components/BookCard';
import Hero from '@/components/Hero';
import { getAllBooks } from '@/lib/actions/book.actions';
import type { IBook } from '@/types';

export default async function Page() {
  const bookResults = await getAllBooks();
  const books: IBook[] = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="pt-23.5 pb-18 min-h-screen">
      <div className="wrapper">
        <Hero />

        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              author={book.author}
              coverURL={book.coverURL}
              slug={book.slug}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
