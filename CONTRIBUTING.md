# Contributing

Thanks for helping build TheraCheck. This guide keeps the team working fast in one repo without stepping on each other.

## Workflow

1. **Pick or open an issue** so the team knows who is on what.
2. **Branch off `main`** with a short, typed name:
   - `feat/<thing>` for features
   - `fix/<thing>` for bug fixes
   - `docs/<thing>`, `chore/<thing>`, `refactor/<thing>` for the rest
3. **Commit small and often** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add listing scraper
   fix(api): handle empty search results
   docs: document env variables
   ```
4. **Open a pull request** into `main` and fill in the template. Link the issue with `Closes #<number>`.
5. **Get one review** from a teammate before merging. Prefer squash merge so `main` stays readable.

## Ground rules

- `main` should always run. Don't push directly to it.
- Never commit secrets. Put them in `.env` (git-ignored) and add the variable _name_ to `.env.example`.
- Keep pull requests focused: one feature or fix per PR.
- Add or update tests when you change behaviour.
- Update `CHANGELOG.md` under **Unreleased** for user-facing changes.

## Code style

Follow the settings in `.editorconfig`. Before you push, run `npm run format`, then the four test scripts:

```bash
npm run test:unit
npm run db:test:up   # needs Docker running
npm run test:int
npm run test:e2e
```

CI runs the same scripts on your pull request. See the Continuous integration section of the [README](README.md#continuous-integration).

## Reporting bugs and requesting features

Use the issue templates. For security problems, follow [SECURITY.md](SECURITY.md) instead.
