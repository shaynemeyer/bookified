# Create Book Detail UI

> **Superseded by [05-remove-voice-input-option.md](./05-remove-voice-input-option.md)**
> The mic button, voice persona pill, and timer were removed in favour of a text chat interface.
> The header card structure and transcript area remain; see spec 05 for current implementation intent.

---

Build a book details page at /books/[slug]. Fetch the book from  
 the database using getBookBySlug(slug) server action — it returns
{ success, data } with title, author, coverURL, and persona.  
 Redirect to / if not found. Require auth via Clerk's auth().

The page has two stacked sections, centered with max-w-4xl:

1. Header card — A warm beige card (#f3e4c7, rounded-xl, padding)
   with a horizontal layout:

- Left: Book cover image (~120px wide, rounded, with shadow).
  ~~Overlapping the bottom-right corner of the cover, place a circular
  white mic button (60px, with a mic-off icon).~~ (removed — see spec 05)
- Right of cover: Book title (serif font, 2xl–3xl, bold), "by
  {author}" subtitle, then a row of small white pill badges: a
  status indicator (gray dot + "Ready"). ~~Voice label and timer
  pills removed.~~ (removed — see spec 05)

2. Transcript area — A tall white rounded card (min-h-[400px])
   below the header. ~~Show a centered mic icon (48px), bold "No
   conversation yet", and "Click the mic button above to start
   talking" hint.~~ Replaced with a text chat interface — see spec 05.

Add a floating back button (circular white, border, shadow,
arrow-left icon) fixed at top-24 left-6.

Use existing CSS classes: vapi-header-card,
vapi-status-indicator, vapi-status-dot, vapi-status-text,
transcript-container, transcript-empty, transcript-empty-text,
transcript-empty-hint, back-btn-floating, book-page-container. The
~~mic button and~~ voice controls are UI-only — no Vapi integration,
just static markup displaying the real book data.

See @docs/mockups/book-detail-mockup.png for original visual reference.
