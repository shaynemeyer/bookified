import Image from 'next/image';
import Link from 'next/link';

const steps = [
  { title: 'Upload PDF', description: 'Add your book file' },
  { title: 'AI Processing', description: 'We analyze the content' },
  { title: 'Text Chat', description: 'Discuss with AI' },
];

function Hero() {
  return (
    <div className="library-hero-card mb-10 md:mb-16">
      <div className="library-hero-content">
        <div className="library-hero-text">
          <h1 className="library-hero-title">Your Library</h1>
          <p className="library-hero-description">
            Convert your books into interactive AI conversations.
            <br />
            Ask questions and discuss your favorite reads.
          </p>

          <div className="library-hero-illustration">
            <Image
              src="/assets/hero-illustration.png"
              alt="Vintage books and globe illustration"
              width={260}
              height={200}
              priority
            />
          </div>

          <Link href="/books/new" className="library-cta-primary">
            + Add new book
          </Link>
        </div>

        <div className="library-hero-illustration-desktop">
          <Image
            src="/assets/hero-illustration.png"
            alt="Vintage books and globe illustration"
            width={340}
            height={260}
            priority
          />
        </div>

        <div className="library-steps-card">
          <div className="flex flex-col gap-4">
            {steps.map(({ title, description }, index) => (
              <div key={title} className="library-step-item">
                <span className="library-step-number">{index + 1}</span>
                <div>
                  <p className="library-step-title">{title}</p>
                  <p className="library-step-description">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
