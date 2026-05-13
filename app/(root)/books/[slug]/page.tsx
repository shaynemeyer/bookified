import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBookBySlug } from '@/lib/actions/book.actions';
import BookChat from '@/components/BookChat';

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success) redirect('/');

  const book = result.data;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="w-5 h-5 text-(--text-primary)" />
      </Link>

      <div className="vapi-main-container gap-4">
        {/* Header card */}
        <div className="vapi-header-card w-full">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL ?? '/placeholder-cover.png'}
              alt={book.title}
              width={120}
              height={180}
              className="rounded-lg object-cover"
              style={{ boxShadow: '0px 10px 30px 0px rgba(0,0,0,0.1)' }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="book-title-lg">{book.title}</h1>
            <p className="subtitle">by {book.author}</p>
            {book.persona && (
              <div className="flex flex-wrap gap-2">
                <span className="vapi-status-indicator">
                  <span className="vapi-status-text capitalize">{book.persona}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <BookChat bookTitle={book.title} persona={book.persona ?? undefined} />
      </div>
    </main>
  );
}
