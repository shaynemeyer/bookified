# Feature Spec: Remove All Voice Remnants

## Goal

Remove voice/VAPI/ElevenLabs UI, constants, types, and dead CSS from across the codebase now that voice chat is gone. The `persona` field is kept and repurposed for text chat tone.

---

## Current State

`components/UploadForm.tsx`:

- Zod schema includes `voice: z.enum(['male', 'female'])` — collected in the form but **never stored in the DB** (`createBook` does not receive it).
- `selectedVoice` watch drives conditional styling on the radio buttons.
- A "Choose Assistant Voice" section renders Male/Female radio buttons.
- `defaultValues: { voice: 'female' }` seeds the unused field.
- Loading overlay copy says *"Preparing your voice assistant"*.
- `persona` label reads *"Choose Interviewer Persona"* — the field is still stored and will be used by the chat system prompt (see spec 06).

`lib/constants.ts`:

- `ASSISTANT_ID` — VAPI assistant env var, unused.
- `voiceOptions` — 11Labs voice IDs (Dave, Daniel, Chris, Rachel, Sarah), unused.
- `voiceCategories`, `DEFAULT_VOICE` — unused.
- `VOICE_SETTINGS` — ElevenLabs stability/similarity settings, unused.
- `VAPI_DASHBOARD_CONFIG` — VAPI turn-taking config reference, unused.

`types.d.ts`:

- `IVoiceSession` — type inferred from the `voiceSessions` schema table.
- `VoiceSelectorProps` — interface for a component that no longer exists.
- `voiceSessions` import from `@/lib/db/schema`.

`app/layout.tsx` line 25:

- Meta description says *"chat with your books using voice"*.

`lib/db/schema.ts` + `lib/db/schema.sqlite.ts`:

- `voiceSessions` table defined in both — nothing in the active codebase writes to it.

`lib/db/index.ts`:

- Exports `voiceSessions` from the schema.

`app/globals.css`:

- Dead `vapi-mic-*`, `vapi-pulse-ring`, `vapi-stat-*`, and `voice-selector-*` CSS classes.

---

## What Changes

### 1. `components/UploadForm.tsx`

**Schema** — remove `voice`:

```ts
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  persona: z.string().min(1, 'Please select a persona'),
});
```

**Form setup** — remove `voice` default and watch:

```ts
// remove: defaultValues: { voice: 'female' }
// remove: const selectedVoice = useWatch({ control, name: 'voice' });
```

**Remove** the entire "Choose Assistant Voice" `<div>` block (lines ~337–372 in current file).

**Update** `persona` field label:

```tsx
// before
<label className="form-label">Choose Interviewer Persona</label>

// after
<label className="form-label">Choose Chat Persona</label>
```

**Update** loading overlay copy:

```tsx
// before
<span>Preparing your voice assistant</span>

// after
<span>Preparing your assistant</span>
```

### 2. `lib/constants.ts`

Delete everything from `ASSISTANT_ID` down through `VAPI_DASHBOARD_CONFIG` (lines ~100–175). Keep `BRAND_COLOR`, `sampleBooks`, file validation constants, and `CLERK_AUTH_APPEARANCE_OVERRIDE`.

### 3. `types.d.ts`

- Remove the `voiceSessions` import from `@/lib/db/schema`.
- Remove `IVoiceSession` type.
- Remove `VoiceSelectorProps` interface.

### 4. `app/layout.tsx`

Update the meta description:

```tsx
// before
'Transform your books into interactive AI conversations. Upload PDFs, and chat with your books using voice.'

// after
'Transform your books into interactive AI conversations. Upload PDFs and chat with your books using AI.'
```

### 5. `lib/db/index.ts`

Remove `voiceSessions` from the export:

```ts
// before
export const { books, bookSegments, voiceSessions } = isPostgres ? ...

// after
export const { books, bookSegments } = isPostgres ? ...
```

### 6. `lib/db/schema.ts` + `lib/db/schema.sqlite.ts` — drop `voiceSessions` (separate migration)

The `voiceSessions` table is dead weight. Remove the table definition from both schema files and run a DB migration. Do this in a separate commit from the rest of the cleanup since it requires a destructive migration.

### 7. `app/globals.css` — remove dead voice CSS

Delete the following class groups:

- `vapi-mic-wrapper`, `vapi-pulse-ring`, `vapi-mic-btn`, `vapi-mic-btn-active`, `vapi-mic-btn-inactive`
- `vapi-cover-glow`, `vapi-stat-box`, `vapi-stat-box-sm`, `vapi-stat-label`, `vapi-stat-value-lg`, `vapi-stat-value-sm`
- `voice-selector-options`, `voice-selector-option`, `voice-selector-option-selected`, `voice-selector-option-default`, `voice-selector-option-disabled`

Keep: `vapi-main-container`, `vapi-header-card`, `vapi-cover-wrapper`, `vapi-status-indicator`, `vapi-status-dot*`, `vapi-status-text` — still used in the book detail header card.

---

## File Checklist

| File                        | Action                                            |
| --------------------------- | ------------------------------------------------- |
| `components/UploadForm.tsx` | Remove `voice` field, watch, radio UI, stale copy |
| `lib/constants.ts`          | Delete all VAPI/ElevenLabs constants              |
| `types.d.ts`                | Remove `IVoiceSession`, `VoiceSelectorProps`      |
| `app/layout.tsx`            | Update meta description                           |
| `lib/db/index.ts`           | Remove `voiceSessions` export                     |
| `app/globals.css`           | Delete dead mic, stat, voice-selector classes     |
| `lib/db/schema.ts`          | Drop `voiceSessions` table (separate migration)   |
| `lib/db/schema.sqlite.ts`   | Drop `voiceSessions` table (separate migration)   |

---

## Out of Scope

- Migrating existing data — `voice` was never persisted and `voiceSessions` has no rows from active use.
- Renaming or changing the `persona` values (Intellectual, Casual, Provocateur, Socratic) — they map cleanly to chat tone.
