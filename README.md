# Local Trade Journal · Edge Journal

**ژورنال اِج — an offline trading journal for risk management and performance analysis.**

Record your trades, review your decisions, and understand your trading performance in a Persian, right-to-left interface. The application runs locally in your browser, with no account registration or backend required.

**Contributions are welcome!** Everyone is welcome to help develop this project through bug reports, ideas, documentation, translations, design improvements, and pull requests. See [Contributing](CONTRIBUTING.md) to get started.

## Features

- **Trade journal:** planned, open, and closed positions; long and short trades; entry and exit details, fees, notes, and lessons.
- **Risk management:** percentage or fixed risk budgets, suggested position size, planned risk/reward, realized P&L, and realized R.
- **Partial exits:** record exits at different R levels and track the remaining position.
- **Multiple accounts:** organize positions by account and configure account-specific risk settings.
- **Setups and confirmations:** customize catalogs, descriptions, multiple selections, and position-specific confirmation details or directions.
- **Market context:** record monthly, weekly, daily, and four-hour directional context.
- **Performance analysis:** filter and compare results by setup, confirmation, session, time, emotion, mistakes, and other factors.
- **Charts:** inspect measured win rates across time and trading factors.
- **Trade excursions:** record maximum favorable/adverse excursion (MFE/MAE) and maximum R reached.
- **Trade images:** attach screenshots and review them in a gallery.
- **Portable backups:** export/import JSON backups and export trade data as CSV.
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

| Mode | Address |
| --- | --- |
| Demo journal | `http://127.0.0.1:8000/index.html?demo=1` |
| Main journal | `http://127.0.0.1:8000/index.html?demo=0` |
| New trade | `http://127.0.0.1:8000/index.html?demo=0#trade-new` |

Keep using the same browser, profile, host, and port to access your saved journal.

## Data and backups

Journal records are saved in browser `localStorage`; attached images use IndexedDB. Demo and main journal records use separate storage keys. The app does not connect to a broker, execute orders, or retrieve live market prices: trades and observations are entered manually.

**Export a full JSON backup regularly**, especially before clearing browser data, switching browser/profile, changing the app's address, or updating the app. A JSON backup includes accounts, catalogs, trades, and attached images. CSV is useful for analysis but does not include image attachments or provide a complete replacement for JSON backups.

Opening the HTML at a different address or copying it to another computer does not transfer saved journal data. Import your JSON backup at the new location. Browser storage for `file://` addresses varies by browser; a consistent local-server address is recommended.

Personal journal exports, recovery files, and development screenshots are excluded from this repository. The embedded demo positions are synthetic; the application also includes starter setup and factor catalogs.

Read the [user guide](docs/user-guide.md) for factor filters, images, maximum R, and other workflows.

## Project structure

```text
local-trade-journal/
├── index.html                 # Complete application and embedded runtime
├── README.md                  # Overview and setup
├── CONTRIBUTING.md            # Contribution workflow and validation
├── THIRD-PARTY-NOTICES.txt     # Bundled dependency notices
├── .gitignore                 # Local files excluded from Git
└── docs/
    └── user-guide.md          # Detailed feature guide
```

## Development

The current application is maintained as a self-contained HTML file. The main journal controller, styles, and markup can be edited directly in `index.html`; some UI components are included as a bundled runtime. This repository contains the delivered application, rather than the historical scripts used to assemble earlier versions of that runtime.

Serve the project locally and test changes in demo mode or an isolated browser profile. Preserve backward compatibility with saved journals and JSON backups, and retain the distinction between demo and main data.

Improvements to accessibility, automated tests, modular source organization, localization, and documentation are welcome. Discuss larger changes in an issue before implementing them, so contributors can coordinate.

## Contribute

We welcome developers of all experience levels. Fork the repository, create a branch, make a focused change, and open a pull request describing the change and how you verified it. You can also [report bugs or suggest features](https://github.com/MohammadmehdiJamalpour/local-trade-journal/issues).

Please use synthetic or anonymized examples in issues and pull requests, and never commit personal journal backups or credentials.

## Third-party acknowledgments

The app embeds React, Headless UI, Heroicons, and supporting libraries. Their notices are provided in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and within the HTML. The embedded Vazirmatn font is distributed under the SIL Open Font License 1.1; its attribution and license are included in the HTML. Retain these notices when distributing modified copies.
