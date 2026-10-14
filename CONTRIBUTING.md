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

## Verification checklist

Choose the checks relevant to your change:

- Open the app and confirm there are no new browser-console errors.
- Check the affected page on desktop and at a narrow mobile width.
- Create, edit, save, and reopen a synthetic trade when changing journal entry.
- Verify risk, fees, P&L, R, and partial exits when changing calculations.
- Export and reimport a full JSON backup when changing data or storage; verify images if affected.
- Confirm demo and main journal records remain separate.
- Preserve existing data migrations and third-party notices.

The repository currently has no automated test runner or build requirement. Describe the manual checks you performed, and add meaningful tests when introducing infrastructure or complex behavior.

Do not commit personal trades, backups, credentials, browser profiles, or temporary development output. Keep discussions respectful and constructive.
