# 25 Voice agent: AI disclosure, transcription notice, opt-out and no stored audio (GitHub #49)

**Owner:** Aditya · **Priority:** P0 · **Time box:** 45 min · **Depends on:** nothing

## Why

The confirm agent says "This is an automated assistant." The planning round (`docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md`) found three rules that need more than that. This is research, not legal advice:

- **California AB 2905** (in force since 1 Jan 2025): calls that use an AI-generated voice must say so.
- **FCC ruling, Feb 2024:** AI voices are "artificial voice" under the TCPA, and such calls must identify who is calling.
- **California Penal Code § 632:** recording a call needs every party's consent, and current lawsuits (SoundHound, ConverseNow) argue that AI transcription counts.

During the hackathon every call goes to a consenting teammate. The agent should still behave as if the office were real, and the judges will ask.

## Before and after

|                 | Before                                                        | After                                                                                                                             |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| First line      | "Hi, this is an automated assistant calling for a patient. …" | "Hi, this is an AI voice assistant from TheraCheck, calling for a patient. This call is transcribed. I have two quick questions." |
| Opt-out         | None                                                          | "If you'd rather not get these calls, just say so." A request is saved and the number is never called by the agent again          |
| Audio           | Stored by ElevenLabs (dashboard default)                      | Not stored; transcript kept for the shortest period offered                                                                       |
| Patient details | Already none                                                  | Unchanged                                                                                                                         |

## What to build

**1. Prompt (`voice/agent-confirm.md`).** New first message as above. Add to the system prompt: if the person says they do not want these calls, or asks to be removed, say "Understood. We won't call this number again. Goodbye.", call `save_call_result` with both answers `unknown` and summary exactly `Opted out of calls.`, then `end_call`. Keep the save, one goodbye, `end_call` order from PR #37.

**2. Do-not-call list.** `POST /api/calls/result` (from #10): when the summary is exactly `Opted out of calls.`, also record the opt-out. Store it as a `do_not_call` row keyed by the listing's phone (a new table, `do_not_call (phone text primary key, created_at timestamptz)`, added through a migration file next to #45's). `POST /api/calls/start` refuses any listing whose phone is on the list with 403 `{ error: "This office asked not to be called." }`.

**3. Dashboard settings (`voice/README.md`).** Document: Privacy → audio storage **off** for the confirm agent; transcript retention at the shortest option; data sharing / training **off**. Remove the earlier advice to keep audio for 7 days.

## Files

- Create: `src/backend/db/migrations/003-do-not-call.sql`
- Modify: `voice/agent-confirm.md`, `voice/README.md`, `src/backend/db/schema.sql`, `src/app/api/calls/result/route.ts`, `src/app/api/calls/start/route.ts`, `src/backend/queries.ts`, and their tests

## Acceptance check

- Tests: an opt-out result adds the phone to `do_not_call` and still returns `{ score, label }`; `calls/start` returns 403 for that listing; running the migration twice is safe.
- Dashboard test call: the agent's first sentence contains "AI voice", "TheraCheck" and "transcribed"; saying "please don't call us again" ends the call politely and the listing's phone is on the list.
- Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md, docs/issues/25-voice-disclosure-optout.md, voice/agent-confirm.md, voice/README.md, src/app/api/calls/result/route.ts and src/app/api/calls/start/route.ts.
Write the failing tests first (opt-out recorded, start refused, migration idempotent). Then change the prompt, add the migration and table, and the two route changes. Update voice/README.md's privacy steps.
Use the stop-slop skill for the spoken lines. Never read .env.local or run db:reset; Docker database only, check docker ps first.
Run the full local CI sequence. Commit with plain conventional commits, no co-author trailer. Do not push. List the dashboard steps the user must apply by hand.
```
