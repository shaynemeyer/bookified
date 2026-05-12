Build a book upload form with a warm literary aesthetic using these existing CSS classes. The form has 5 fields stacked vertically with space-y-8 gap:

PDF file upload — A dropzone area (upload-dropzone) with a dashed border, upload icon, "Click to upload PDF" text, and "PDF file (max 50MB)" hint. When a file is selected, it shows the filename with a remove button.

Cover image upload — Same dropzone style but with an image icon, "Click to upload cover image" text, and "Leave empty to auto-generate from PDF" hint.

Title input — A text field (form-input) with label "Title" (form-label) and placeholder "ex: Rich Dad Poor Dad".

Author input — Same style, label "Author Name", placeholder "ex: Robert Kiyosaki".

Voice selector — Label "Choose Assistant Voice" with two groups (Male Voices: Dave, Daniel, Chris; Female Voices: Rachel, Sarah). Each voice is a radio card (voice-selector-option) showing the voice name and description. Selected state uses voice-selector-option-selected.

Submit button — Full-width (form-btn) with text "Begin Synthesis", brown background (#663820), white text, serif font.

Use shadcn/ui Form components with react-hook-form and zod validation. Wrap everything in a new-book-wrapper container. Show a LoadingOverlay when submitting.
