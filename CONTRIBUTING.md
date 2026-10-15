# Contributing to Local Trade Journal

Contributions are welcome from everyone! Help us improve the journal with bug reports, feature ideas, documentation, translations, accessibility fixes, design changes, or code.

## Report an issue

Describe what happened, what you expected, your browser, and steps to reproduce. Include a synthetic example when possible. Remove personal financial information from screenshots and exported data.

## Submit a pull request

1. Fork the repository and create a branch for your change.
2. Read the README and run the app locally.
3. Make a focused change and preserve the existing Persian/RTL interface.
4. Verify the affected behavior using demo data or an isolated browser profile.
5. Open a pull request explaining the problem, the change, and your validation. Include screenshots for interface changes.

For larger changes, open an issue first so we can discuss the approach.

## Maintained source and commands

Use Node 24+, `npm ci`, and `npx playwright install chromium firefox webkit` (add `--with-deps` on supported Linux CI). Edit `src/`; `npm run build` regenerates the root artifact. Do not edit generated HTML directly. Format with `npx prettier --write src tests scripts`.

Run `npm run check`, `npm run test:coverage`, `npm run format:check`, `npm run secrets:check`, `npm run dependencies:check` and appropriate Playwright workflows. Run `npm run verify:reproducible` before release. The dependency check rejects unreviewed high/critical findings and verifies the constrained, expiring review in `docs/dependency-review.json`. A raw `npm audit` still reports the reviewed development-only advisory chain; it is not a zero-finding audit. An unavailable advisory service fails the check. Keep the lockfile and generated notices aligned.

Domain/reporting code must run independently of the DOM. Persist canonical decimal strings and calculate with Decimal; never rebuild financial values from rounded display numbers. Await repository transaction completion before updating committed UI state. Hashing, parsing, image decoding and encryption occur outside write transactions.

React owns its mounted descendants. Keep compatibility adapters narrow and migrate controller functions by responsibility. Preserve Persian digits, Jalali dates, RTL order, keyboard navigation, focus, reduced motion and main/demo separation. Imported text stays text; no remote runtime dependencies, dynamic evaluation or executable images.

Never make a damaged or unsupported source writable through an ordinary save. Preserve exact originals before explicit recovery. Schema changes require documented legacy assumptions, migration previews, synthetic fixtures, interrupted/failure cases and full backup round trips. App/document/database versions are separate.

Use the [release checklist](docs/release-validation.md). Attach actual results and browser/hardware details. Configured tests and core-only coverage do not prove whole-application acceptance. Automated accessibility scans do not replace keyboard and screen-reader review.

## Verification checklist

Choose the checks relevant to your change:

- Open the app and confirm there are no new browser-console errors.
- Check the affected page on desktop and at a narrow mobile width.
- Create, edit, save, and reopen a synthetic trade when changing journal entry.
- Verify risk, fees, P&L, R, and partial exits when changing calculations.
- Export and reimport a full JSON backup when changing data or storage; verify images if affected.
- Confirm demo and main journal records remain separate.
- Preserve existing data migrations and third-party notices.

The maintained source and automated checks above are required for code changes. Describe manual checks and any validation limitations alongside the automated results.

Do not commit personal trades, backups, credentials, browser profiles, or temporary development output. Keep discussions respectful and constructive.
