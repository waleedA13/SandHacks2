# Security Policy

## Supported versions

Only the latest commit on `main` receives security fixes.

| Version        | Supported |
| -------------- | --------- |
| `main`         | Yes       |
| other branches | No        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public issues, discussions, or pull requests.**

Report them privately through GitHub: open the **Security** tab of this repository and click **Report a vulnerability** ([direct link](https://github.com/waleedA13/TheraCheck/security/advisories/new)).

Please include:

- The type of issue (for example XSS, injection, exposed credential)
- The file paths or URLs involved
- Steps to reproduce, and a proof of concept if you have one
- The impact as you understand it

## What to expect

- We acknowledge reports within **72 hours**.
- We send an assessment and a planned fix timeline within **7 days**.
- We credit reporters in the advisory unless you ask us not to.

## Our practices

- Secrets live only in environment variables. `.env` is git-ignored and `.env.example` lists variable names only.
- Every push and pull request is scanned for leaked secrets (Gitleaks).
- Pull requests are checked for vulnerable dependencies (GitHub Dependency Review).
- Dependabot keeps dependencies and GitHub Actions up to date.

If a secret is ever committed, rotate it immediately. Removing it from git history is not enough.
