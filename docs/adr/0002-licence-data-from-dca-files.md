# 0002. Licence data from DCA's public files, not the board's search page

- **Status:** Proposed
- **Date:** 2026-11-15
- **Deciders:** Waleed

## Context

Issue 18 (GitHub #22) planned to scrape the California Department of Consumer Affairs licence search (`search.dca.ca.gov`) through Bright Data. Both Bright Data products we use refuse the site because it is a government site, until the account passes Bright Data's KYC check. The search form also has a Cloudflare Turnstile check, so scraping it some other way would mean getting past a CAPTCHA.

DCA publishes monthly licensee files for each board, free to download. They have name, licence type and number, city, county, dates and status, but no disciplinary actions and no link to each person's record. DCA's Search API (iServices) has live status and possibly discipline, but needs an access request and looks up by licence number only. The federal NPI Registry has a free public API that often lists a provider's state licence number, and we already call it in `npi.ts`.

## Decision

Licence evidence comes from DCA's monthly files for the Behavioral Sciences, Psychology and Registered Nursing boards. Nursing keeps only the nurse practitioner and clinical nurse specialist rows. The files are downloaded by hand into the gitignored `data/` folder and read only by the collector. Pages never read them.

A listing matches a record by licence number first. The number comes from the NPI Registry or from the listing's Psychology Today profile, and it must belong to a licensee of the listing's type with the same first and last name. If no number matches, the issue's original rule applies: exactly one same-name, same-type licensee in the state, whose address is in the listing's city or county. An ambiguous result stores nothing.

## Consequences

- Licence checks work today without Bright Data, and they are fast: about 0.3 s per listing.
- Pages can show licence status but not discipline, which stays "unknown". The evidence link goes to DCA's search page, not to each person's record.
- Revoked and cancelled licences are not in the files, so a missing match must read "could not match", never "unlicensed".
- Someone must download the files each month and re-run the licence step.
- Moving to DCA's Search API later, for discipline and live status, would supersede this ADR.
