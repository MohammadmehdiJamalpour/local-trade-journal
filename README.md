# Local Trade Journal · Edge Journal

**ژورنال اِج — an offline trading journal for risk management and performance analysis.**

Record your trades, review your decisions, and understand your trading performance in a Persian, right-to-left interface. The application runs locally in your browser, with no account registration or backend required.

**Contributions are welcome!** Everyone is welcome to help develop this project through bug reports, ideas, documentation, translations, design improvements, and pull requests. See [Contributing](CONTRIBUTING.md) to get started.

## Features

- **Trade journal:** planned, open, and closed positions; long and short trades; entry and exit details, fees, notes, and lessons.
- **Risk management:** percentage or fixed risk budgets, suggested position size, planned risk/reward, realized P&L, and realized R.
- **Partial exits:** record price/quantity fills with conversion rates and fill fees; retain legacy R/percentage exits and track the remaining position.
- **Multiple accounts:** organize positions by account, set each account's currency, and configure account-specific risk settings.
- **Linear markets:** define units, forex lots or futures contracts with explicit multipliers, increments and currency conversion rates.
- **Executed-trade corrections:** preview economic changes, supply a reason and retain the before/after audit history.
- **Setups and confirmations:** customize catalogs, descriptions, multiple selections, and position-specific confirmation details or directions.
- **Market context:** record monthly, weekly, daily, and four-hour directional context.
- **Performance analysis:** filter and compare results by setup, confirmation, session, time, emotion, mistakes, and other factors.
- **Charts:** inspect measured win rates across time and trading factors.
- **Trade excursions:** record maximum favorable/adverse excursion (MFE/MAE) and maximum R reached.
- **Trade images:** attach screenshots and review them in a gallery.
- **Portable backups:** export/import full JSON or password-encrypted backups, and exchange economic trade data as CSV.
- **Responsive interface:** dark theme with Persian typography for desktop and mobile.
- **Demo environment:** explore 100 synthetic positions separately from your main journal.

## Get started

### Open directly

1. Download this repository using **Code → Download ZIP**, or clone it:

   ```sh
   git clone https://github.com/MohammadmehdiJamalpour/local-trade-journal.git
   cd local-trade-journal
   ```

2. Open `index.html` in a modern browser.
3. The supplied app opens in demo mode by default. Use the journal-mode switch to open your main journal.

No installation, npm dependencies, or build step is needed to run the app. HTML, styles, JavaScript, UI runtime, demo data, and font are embedded in `index.html`.

### Run with a local server

For a consistent browser origin, serve the repository with Python 3:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open these addresses in your browser:

| Mode         | Address                                             |
| ------------ | --------------------------------------------------- |
| Demo journal | `http://127.0.0.1:8000/index.html?demo=1`           |
| Main journal | `http://127.0.0.1:8000/index.html?demo=0`           |
| New trade    | `http://127.0.0.1:8000/index.html?demo=0#trade-new` |

Keep using the same browser, profile, host, and port to access your saved journal.

## Data and backups

Application **0.2.0** uses document **13** and IndexedDB layout **1**. Records, accounts, catalogs, images, drafts, revisions, correction history and recovery snapshots now share one transactional IndexedDB database. Main/demo remain separate. localStorage holds only legacy sources, small preferences and revision notifications. Trades and conversions are entered manually.

**Export a full JSON backup regularly**, especially before clearing browser data, switching browser/profile, changing the app's address, or updating the app. A JSON backup includes accounts, catalogs, trades, and attached images. CSV is useful for analysis but does not include image attachments or provide a complete replacement for JSON backups.

Full JSON now also includes correction history. Optional password-protected exports use AES-256-GCM, PBKDF2-SHA-256 (600,000 iterations), fresh salt/IV and authenticated metadata. Passwords require 12 characters and cannot be recovered. Ordinary browser storage remains **unencrypted**.

Legacy versions 1–11 and transition version 12 remain importable. Startup presents an upgrade preview and full-backup action before accepting legacy data. Damaged sources stay read-only until explicit recovery. Exact originals are deduplicated and pinned; old keys remain until explicit cleanup. **Older releases cannot read version 13**; rollback requires a compatible old snapshot and must never silently discard newer fields. See [recovery](docs/recovery.md).

Opening the HTML at a different address or copying it to another computer does not transfer saved journal data. Import your JSON backup at the new location. Browser storage for `file://` addresses varies by browser; a consistent local-server address is recommended.

Personal journal exports, recovery files, and development screenshots are excluded from this repository. The embedded demo positions are synthetic; the application also includes starter setup and factor catalogs.

Read the [user guide](docs/user-guide.md) for factor filters, images, maximum R, and other workflows.

## Project structure

```text
local-trade-journal/
├── index.html                 # Generated portable release; do not edit
├── src/                       # Maintained application source
├── tests/                     # Synthetic unit/failure/browser tests
├── scripts/                   # Build, artifact, notices and security checks
├── package-lock.json          # Exact dependency lock
├── README.md                  # Overview and setup
├── CONTRIBUTING.md            # Contribution workflow and validation
├── THIRD-PARTY-NOTICES.txt     # Bundled dependency notices
├── .gitignore                 # Local files excluded from Git
└── docs/                      # Guides, schema/architecture, validation and benchmarks
```

## Development

Use Node.js 24+ and the committed lockfile. Edit `src/`, not the generated root HTML.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run verify:artifact
npx playwright test --grep-invert "benchmark|image stress"
npm run verify:reproducible
npm run secrets:check
npm run dependencies:check
```

The build generates `dist/index.html`, identical root HTML, a manifest and dependency inventory. Scripts, styles, font, icons and workers are embedded. No build timestamp or machine path is inserted. `node scripts/serve.mjs` serves the production artifact on `http://127.0.0.1:18850`.

Dependency checks fail on unreviewed high/critical findings. The current build-only braces advisory and constrained review are recorded in `docs/dependency-review.json`; a raw npm audit still reports that reviewed chain. Runtime dependencies have a separate inventory. An unavailable advisory service fails the check.

On Windows, `EDGE_JOURNAL_SYSTEM_BROWSERS=1` enables installed `chrome` and `edge` Playwright projects. Run performance and image-stress tests separately from competing builds/browser suites. The release workflow runs both and compares the timing report to the matching [workstation baseline](docs/benchmarks/README.md). See [release validation](docs/release-validation.md) for measured evidence and remaining gates.

Strict TypeScript covers domain, repository, imports/encryption, reporting, services and React controls. The readable extracted `src/legacy/controller.js` still uses JavaScript with `checkJs: false`; this is a documented modernization boundary, not evidence of whole-application strict checking or coverage. The opaque compiled UI runtime has been replaced with maintained React controls. See [architecture](docs/architecture.md).

Units/shares, linear crypto, forex lots and linear futures use explicit multipliers and currency conversions. Monetary reports are separated by currency. Options, inverse contracts, tax accounting, broker connections, live prices and portfolio currency valuation are unsupported. See [calculation conventions](docs/calculations.md).

## Contribute

We welcome developers of all experience levels. Fork the repository, create a branch, make a focused change, and open a pull request describing the change and how you verified it. You can also [report bugs or suggest features](https://github.com/MohammadmehdiJamalpour/local-trade-journal/issues).

Please use synthetic or anonymized examples in issues and pull requests, and never commit personal journal backups or credentials.

## Third-party acknowledgments

The app embeds React, Headless UI, Heroicons, and supporting libraries. Their notices are provided in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and within the HTML. The embedded Vazirmatn font is distributed under the SIL Open Font License 1.1; its attribution and license are included in the HTML. Retain these notices when distributing modified copies.
