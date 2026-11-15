# 20 Search by city or ZIP code, with insurers from the database (GitHub #40)

**Owner:** Tracy (Qinggin) · **Priority:** P1 · **Time box:** 2 h · **Depends on:** 08. Touches `app/page.tsx` and `components/SearchForm.tsx`, so do not work on it at the same time as 17 or 19.

## Why

The search form offers one insurer, `Aetna`, typed into the code. The real listings from the collector are Cigna (see `docs/smoke-test.md`), so once they land nobody can reach them from the page. The city field is a fixed list of six cities, most with no data, and there is no way to look in one part of a city.

## Before and after

|                 | Before                                           | After                                                                              |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Insurer list    | `["Aetna"]` in `components/SearchForm.tsx`       | Every insurer that has listings, read from the database                            |
| Where           | A dropdown of six fixed cities                   | One box, "City or ZIP code", with the cities we have as suggestions                |
| ZIP search      | Not possible                                     | `92103` shows only listings whose address has that ZIP                             |
| First visit     | Always Aetna, San Diego, even with no Aetna data | The first insurer and city that have listings                                      |
| No results      | "Try Aetna in San Diego", typed into the code    | Names an insurer and city that do have listings                                    |
| Links and voice | `?insurer=&city=`                                | The same two parameters, so shared links, the API and the voice agent keep working |

## What to build

**1. Search options from the database.** Add `listSearchOptions()` to `lib/queries.ts`. It returns `{ insurers: string[]; cities: string[] }`: the distinct insurers and the distinct cities in `listings`, each sorted A to Z.

**2. City or ZIP in the same parameter.** Keep the query parameter named `city` and keep the signature `listSummaries(insurer, city, filters?)`. Change only how `city` is matched, in the one shared query (`summaryRows` in `lib/queries.ts`):

- Exactly five digits: match listings whose `address` contains that ZIP as a whole number (`92103` must not match `192103` or `9210`).
- Anything else: match the listing's city, ignoring case, as today.

`getStats` and `GET /api/listings` call the same query, so they follow without changes. Trim the value and cap it at 60 characters before it reaches the query.

**3. The form (`components/SearchForm.tsx`).**

- Insurer: the same `<select>`, with options from `listSearchOptions().insurers`. Remove the `INSURERS` and `CITIES` constants.
- Where: replace the city `<select>` with `<input type="text" name="city">`, label "City or ZIP code", `autocomplete="address-level2"`, and a `<datalist>` of `listSearchOptions().cities`. A hint under it: "For example San Diego or 92103."
- It stays a plain GET form that works without JavaScript.
- The collapsed pill reads `{insurer} · {city or ZIP} · Change`.

**4. The page (`app/page.tsx`).**

- With no `insurer` or `city` in the URL, use the first insurer from the options and the first city that insurer has listings in.
- The summary sentence reads "Of 12 Cigna listings in San Diego, …" for a city and "Of 4 Cigna listings in 92103, …" for a ZIP.
- The empty state reads "We don't have listings for that insurer and place yet." and its button links to an insurer and city from the options. If the database has no listings at all, show "No listings yet." and no button.

## Not in this issue

- Street-address or "within 5 miles" search. Listings have no map coordinates, and looking them up would send a patient's address to an outside service.
- Filters for what the therapist treats, language, or video sessions. Those are issue 17.
- A plan picker. Each insurer has one plan in the data today.

## Files

- Modify: `lib/queries.ts`, `lib/queries.int.test.ts`, `components/SearchForm.tsx`, `app/page.tsx`, `app/globals.css`, `e2e/home.spec.ts`
- Do not touch: `app/api/`, `components/VoiceWidget.tsx`, `voice/`, `verifier/`, `collector/`

## Interfaces

- **Consumes:** `listSummaries`, `getStats` from `lib/queries.ts`.
- **Produces:** `listSearchOptions(): Promise<{ insurers: string[]; cities: string[] }>` in `lib/queries.ts`. `listSummaries(insurer, city, filters?)` keeps its signature; `city` may now be a five-digit ZIP.

## Acceptance check

- `npm run test:int` passes with new cases in `lib/queries.int.test.ts`:
  - `listSearchOptions()` on the seed data returns `["Aetna"]` and `["San Diego"]`
  - `listSummaries("Aetna", "92103")` returns only the seed listings whose address ends in `92103`
  - `listSummaries("Aetna", "9210")` and `listSummaries("Aetna", "192103")` return nothing
  - `listSummaries("aetna", "san diego")` still returns all 12
  - `getStats("Aetna", "92103").total` equals the number of `92103` listings
- `GET /api/listings?insurer=Aetna&city=92103` returns the same listings as the page, with no change to the route file.
- With JavaScript disabled, typing a city or a ZIP and pressing "Show therapists" returns results.
- A search with a ZIP that has no listings shows the empty message and a working button.
- Opening `/` with no parameters shows results, not the empty state, whenever the database has listings.
- A listing opened from ZIP results has a "Back" link that returns to the same ZIP results.
- At 320px wide the form has no sideways scrolling and the input is at least 44px tall.
- `npm run format:check`, `lint`, `typecheck`, `test:unit`, `test:int` and `test:e2e` pass.

## Prompt for your Claude

```
Read CLAUDE.md, AGENTS.md, and docs/issues/20-search-city-zip-insurers.md. This is Next.js 16: read the relevant guide in node_modules/next/dist/docs/ before changing a page.
Read lib/queries.ts (summaryRows, listSummaries, getStats), lib/queries.int.test.ts, components/SearchForm.tsx, app/page.tsx, components/ListingCard.tsx and app/listing/[id]/page.tsx as they are now. Read db/seed.sql to see which ZIP codes the seed addresses use.

Start with the tests. Add the cases in the acceptance check to lib/queries.int.test.ts, run npm run db:test:up and npm run test:int, and see them fail. Never run npm run db:reset and never read .env.local: tests use the Docker database only.

Then, in lib/queries.ts:
- add listSearchOptions(), returning the distinct insurers and cities, sorted
- in summaryRows, when the city value is exactly five digits, match it as a whole ZIP inside address; otherwise keep the case-insensitive city match. Keep it in the tagged sql template with the value as a parameter; never build SQL from a string.
Do not change listSummaries' signature, the API routes or the voice files.

Then the form and the page: options from listSearchOptions(), the "City or ZIP code" text input with a datalist and the hint, the defaults, the summary wording and the empty state, as the issue describes. Keep the form a plain GET form with no client component.
Use the frontend-design skill so the input matches the existing select: same height, border, label style and focus ring.

Update e2e/home.spec.ts if the old dropdown breaks it, and add one e2e check that a ZIP search shows results.
Check 320px, 390px and 1280px widths and JavaScript disabled, and show me screenshots.
Only touch the files listed in the issue. Do not commit; show me the diff and a proposed commit message.
```
