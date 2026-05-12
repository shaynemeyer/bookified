import BookCard from '@/components/BookCard';
import Hero from '@/components/Hero';
import { sampleBooks } from '@/lib/constants';

export default function Page() {
  return (
    <main className="pt-23.5 pb-18 min-h-screen">
      <div className="wrapper">
        <Hero />

        <div className="library-books-grid">
          {sampleBooks.map((book) => (
            <BookCard
              key={book._id}
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
