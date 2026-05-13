# Bookified

Transform your books into interactive AI conversations. Upload PDFs and chat with your books using text.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Clerk](https://clerk.com) — authentication
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## Getting Started

Copy the environment variables and fill in your [Clerk API keys](https://dashboard.clerk.com/~/api-keys):

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
