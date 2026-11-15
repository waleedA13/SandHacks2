# 14 Spanish page text and voice

**Owners:** Tracy (pages), Aditya (voice) · **Priority:** P2 (stretch) · **Time box:** 1 h · **Depends on:** 10, and 12 for the voice half

Only start this if every P0 issue is merged.

## User stories

Every feature, for Elena:

- US-F1-E: the list in words she is comfortable with.
- US-F2-E: reasons and "last checked" in Spanish.
- US-F3-E: the call result in Spanish.
- US-F4-E: ask the helper agent in Spanish.
- US-F5-E, US-F6-E: status messages and the accuracy sentence in Spanish.

## What to build

**Pages (Tracy).** A language switch (English / Español) in the header that keeps the current page and search. All fixed text on both pages has a Spanish version: headings, labels, buttons, the five label names, the three fact questions, empty and error states, the honesty note. The choice is carried in the URL so a link can be shared in Spanish.

Reasons written by Gemini are stored in English. For Spanish, show the English reason unless Aditya has time for the item below.

**Voice (Aditya).** The helper agent answers in the language the caller speaks. The confirm agent stays in English.

**Optional, only if time remains (Aditya).** The verifier also writes `reason_es`. This changes the shared contract, so tell the team before doing it.

## Files

- Create: `lib/i18n.ts` (one object per language, keyed by string id)
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/listing/[id]/page.tsx`, `components/**`, `voice/agent-helper.md`

## Interfaces

- **Produces:** `t(lang: "en" | "es", key: string): string` in `lib/i18n.ts`.

## Acceptance check

- With Spanish selected, no English fixed text remains on either page, checked at 320px.
- The Spanish wording has been read by a Spanish speaker, or is marked in the write-up as machine-translated and unreviewed.
- A shared link with Spanish selected opens in Spanish.
- Speaking Spanish to the helper agent gets a Spanish reply.

## Prompt for your Claude (Tracy, pages)

```
Read CLAUDE.md, the plan's "Personas" (Elena) and docs/issues/14-spanish.md.

Create lib/i18n.ts with en and es objects and a t(lang, key) function. Move every fixed string from both pages and the components into it. Do not add a translation library.
Add an English / Español switch to the header that sets ?lang= and preserves the rest of the URL.
Write the Spanish in plain, everyday Latin American Spanish, and list any phrase you are unsure about so a Spanish speaker can check it.
Do not commit; show me the diff and a proposed commit message.
```

## Prompt for your Claude (Aditya, voice)

```
Read voice/agent-helper.md and docs/issues/14-spanish.md.
Check the ElevenLabs Agents docs for multi-language agents and language detection.
Update the helper agent's configuration and prompt so it replies in the caller's language (English or Spanish), and update voice/README.md with the dashboard steps.
Do not commit; show me the diff and a proposed commit message.
```
