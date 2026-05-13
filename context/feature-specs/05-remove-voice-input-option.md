# Feature Spec: Replace Voice UI with Text Chat

## Goal

Remove all voice/mic UI from the book detail page and replace it with a standard text-based chat interface. No VAPI or ElevenLabs integration — just a user typing messages and receiving responses.

---

## Current State

`app/(root)/books/[slug]/page.tsx` is a server component that:

- Fetches the book via `getBookBySlug(slug)`
- Renders a static mic-button header card (`vapi-header-card`, `vapi-mic-btn`, `vapi-mic-wrapper`)
- Shows a voice-oriented empty state (mic icon + "Click the mic button above to start talking")
- Has no interactive state — everything is static markup

The CSS in `globals.css` already defines all the transcript bubble classes needed for a chat UI:
`transcript-container`, `transcript-messages`, `transcript-message`, `transcript-message-user`,
`transcript-message-assistant`, `transcript-bubble`, `transcript-bubble-user`,
`transcript-bubble-assistant`, `transcript-empty`, `transcript-empty-text`, `transcript-empty-hint`.

---

## What Changes

### 1. `app/(root)/books/[slug]/page.tsx` — stays server component

- Remove: `MicOff`, `Mic` imports from `lucide-react`
- Remove: `vapi-mic-wrapper` + `vapi-mic-btn` button overlapping the cover
- Remove: the "Voice: {persona}" pill badge and the "0:00/15:00" timer pill
- Keep: the `vapi-header-card` layout (beige card, cover image, title, author, "Ready" status pill)
- Keep: `back-btn-floating`, `book-page-container`, `vapi-main-container`
- Replace the transcript area static markup with `<BookChat bookTitle={book.title} />` (new client component)

### 2. `components/BookChat.tsx` — new `'use client'` component

Owns all interactive state. Props: `bookTitle: string`.

**State:**

```ts
const [messages, setMessages] = useState<
  { role: 'user' | 'assistant'; text: string }[]
>([]);
const [input, setInput] = useState('');
const [pending, setPending] = useState(false);
```

**Layout (inside `transcript-container`):**

- Message list area using existing classes:
  - `transcript-messages` — scrollable flex-col container
  - Per message: `transcript-message` + `transcript-message-user` or `transcript-message-assistant`
  - Bubble: `transcript-bubble` + `transcript-bubble-user` or `transcript-bubble-assistant`
- Empty state (when `messages.length === 0`):
  - Use `transcript-empty`, `transcript-empty-text`, `transcript-empty-hint`
  - Change icon to `MessageCircle` (lucide-react), copy to "No conversation yet" / "Type a message below to get started"
- Text input bar pinned to the bottom of the card:
  - `<textarea>` or `<input>` for the message
  - Send button (disabled when `input` is empty or `pending` is true)
  - `onKeyDown`: submit on `Enter` (not `Shift+Enter`)
- Auto-scroll to bottom when new messages are appended (via `useRef` on the message list + `useEffect`)

**Send handler (stub for now):**

```ts
async function handleSend() {
  if (!input.trim() || pending) return;
  const userMsg = input.trim();
  setInput('');
  setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
  setPending(true);
  // TODO: call server action or API route with userMsg + bookTitle
  setPending(false);
}
```

The actual AI response is out of scope for this spec — leave a `// TODO` placeholder that appends a stub assistant reply so the UI is testable end-to-end.

### 3. `globals.css` — add chat input bar classes

Add a new section after the transcript classes:

```css
/* ===========================================
   CHAT INPUT BAR
   =========================================== */
.chat-input-bar {
  @apply flex items-end gap-3 px-4 pb-4 pt-2 border-t border-[#f3e4c7];
}
.chat-input {
  @apply flex-1 resize-none rounded-xl border border-[#e5d5b5] bg-[#fdfaf5]
         px-4 py-3 text-sm text-[var(--text-primary)] leading-6
         focus:outline-none focus:ring-2 focus:ring-[#663820]/30
         disabled:opacity-50;
}
.chat-send-btn {
  @apply shrink-0 w-10 h-10 rounded-full bg-[#663820] text-white
         flex items-center justify-center transition-all duration-200
         hover:bg-[#7a4428] active:scale-95
         disabled:opacity-40 disabled:cursor-not-allowed;
}
```

### 4. Remove dead `vapi-*` CSS (optional cleanup, separate commit)

The following classes become unused after this change and can be deleted in a follow-up:
`vapi-mic-wrapper`, `vapi-pulse-ring`, `vapi-mic-btn`, `vapi-mic-btn-active`, `vapi-mic-btn-inactive`,
`vapi-cover-glow`, `vapi-stat-box`, `vapi-stat-box-sm`, `vapi-stat-label`, `vapi-stat-value-lg`,
`vapi-stat-value-sm`, all `.voice-selector-*` classes.

Do **not** remove: `vapi-main-container`, `vapi-header-card`, `vapi-cover-wrapper`, `vapi-status-indicator`,
`vapi-status-dot*`, `vapi-status-text` — still used in the header card.

---

## File Checklist

| File                               | Action                                 |
| ---------------------------------- | -------------------------------------- |
| `app/(root)/books/[slug]/page.tsx` | Edit — remove mic UI, add `<BookChat>` |
| `components/BookChat.tsx`          | Create — client component              |
| `app/globals.css`                  | Edit — add chat input bar classes      |

---

## Out of Scope

- AI/LLM integration (server action, API route, streaming)
- Message persistence
- CSS cleanup of unused `vapi-*` classes (separate commit)
