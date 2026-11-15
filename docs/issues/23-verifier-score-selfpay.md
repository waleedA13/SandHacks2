# 23 Verifier and score: self-pay fact, "Pay yourself" and caller reports (GitHub #47)

**Owner:** Aditya · **Priority:** P0 · **Time box:** 1 h · **Depends on:** #45

## Why

Today a therapist whose own site says "we don't take insurance" gets `listsInsurer: no`, which scores them as a **Likely dead end**. For someone willing to pay, they are not a dead end; they are a self-pay option with, often, a posted price. The planning round agreed TheraCheck is for everyone, insurance-first, so these listings get their own label, **Pay yourself**.

The booking flow also adds a second kind of call result: a user who calls an office themselves taps "Did they answer? Are they taking patients?" That answer should move the listing like an agent call does, under its own label so nobody mistakes it for our check.

## Before and after

|                                       | Before          | After                                                |
| ------------------------------------- | --------------- | ---------------------------------------------------- |
| "Doesn't take insurance, private pay" | Likely dead end | **Pay yourself**                                     |
| Self-pay fact                         | Not extracted   | `seesSelfPay` from the same single Gemini request    |
| A user's report after calling         | Not possible    | Overrides like a call, labelled `Caller reported: …` |
| Agent call result                     | `Demo call: …`  | Unchanged                                            |

## What to build

**1. Verifier (`src/backend/verifier/gemini.ts`, `verify.ts`).** Add `seesSelfPay` (`yes`, `no`, `unknown`) to the existing response schema, prompt and `parseFacts` validation, in the same single request. Prompt wording: "seesSelfPay: does any source say they see clients who pay for themselves (private pay, self-pay, out-of-network, superbill)? Silence is unknown." Save it to `verdicts.sees_self_pay`. It does not change the numeric score.

**2. Score (`src/shared/score.ts`).** `scoreVerdict(v, call?)` where `v` now includes `seesSelfPay` and `call` includes `source: "agent" | "caller"`:

- A call (either source) still overrides first. `agent` keeps the `Demo call: …` labels; `caller` uses `Caller reported: available` (100) and `Caller reported: unavailable` (0).
- Otherwise compute the score exactly as today.
- Then, if `listsInsurer` is `no`, `seesSelfPay` is `yes`, and `stillPractising` is not `no`, the label is **`Pay yourself`** whatever the score. The score is unchanged, so sorting stays as it is.

**3. Reads (`src/backend/queries.ts`).** Pass `sees_self_pay` and the latest done call's `source` into `scoreVerdict` everywhere a final score is computed.

## Files

- Modify: `src/backend/verifier/gemini.ts`, `src/backend/verifier/verify.ts`, `src/shared/score.ts`, `src/backend/queries.ts`, and their tests

## Interfaces

- **Consumes:** columns and labels from #45.
- **Produces:** `scoreVerdict(v: { stillPractising; listsInsurer; acceptingNew; seesSelfPay }, call?: { takesPlan; acceptingNew; source })`.

## Acceptance check

- Unit tests in `src/shared/score.test.ts`:
  - `listsInsurer no` + `seesSelfPay yes` + `stillPractising unknown` → `Pay yourself`, score unchanged
  - the same with `stillPractising no` → `Likely dead end`
  - a `caller` call with yes/yes → `Caller reported: available`, 100; with a no → `Caller reported: unavailable`, 0
  - an `agent` call keeps the `Demo call` labels
  - all existing cases still pass
- Verifier unit test: a hostile evidence string cannot set `seesSelfPay` to an invalid value; a missing field fails validation.
- One live Gemini run on a made-up evidence string that says "private pay only, $150, superbill provided" returns `seesSelfPay: yes` (paste the output in the PR).
- Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md, docs/issues/23-verifier-score-selfpay.md and docs/issues/21-contract-booking-lines-selfpay.md.
Read src/shared/score.ts and its test, src/backend/verifier/gemini.ts, verify.ts and their tests, and src/backend/queries.ts.

Write the failing score tests from the acceptance check first and see them fail. Then change scoreVerdict exactly as the issue says. Then add seesSelfPay to the single Gemini request, the schema and parseFacts, save it, and pass it and the call source through queries.ts.
Tests never call Gemini. Never read .env.local or run db:reset. Use the Docker database for integration tests; check docker ps first because other worktrees share the ports.
Run the full local CI sequence. Commit with plain conventional commits, no co-author trailer. Do not push.
```
