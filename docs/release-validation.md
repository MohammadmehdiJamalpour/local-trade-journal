# Release validation — application 0.2.0

Review date: **2026-10-15**. Document format: **13**. IndexedDB layout: **1**.

This is a provisional implementation and evidence review. The work materially improves the original journal's data safety, calculations, portability and automated verification. It does **not** establish completion of every 9–9.5/10 target in the modernization plan. In particular, whole-application coverage, complete removal of the compatibility controller and manual screen-reader acceptance remain open.

The full functional matrix completed against the validated behavior artifact identified below: **166 passed, 2 intentionally skipped, 0 failed, 0 flaky** across installed Chrome/Edge, Firefox and WebKit. Chrome and Edge each passed 42 cases; Firefox and WebKit each passed 41 and skipped direct-file startup, outside their localhost support target. The preserved report is `output/functional-final.json`.

## Evidence and its scope

| Evidence                            | Current result                                                                                                                 | Source                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Unit/integration suite              | 289 tests passed across 14 files in the latest core run                                                                        | `tests/unit/`; rerun with `npm test`                          |
| Core line coverage                  | 98.94% — 843/852 lines                                                                                                         | `coverage/coverage-summary.json`                              |
| Core branch coverage                | 94.08% — 747/794 branches                                                                                                      | Same report                                                   |
| Core function/statements coverage   | 98.91% / 98.90%                                                                                                                | Same report                                                   |
| Functional browser workflows        | 166 passed, 2 intentional skips; no failures or retries                                                                        | `output/functional-final.json`                                |
| Windows Chrome performance          | All specified p95 thresholds measured in this run passed                                                                       | `output/performance/report.json`                              |
| Image fixture and navigation memory | 200-image startup and bounded navigation-memory assertions passed                                                              | `output/performance/images-chrome.json`                       |
| Dependency audit                    | Zero production findings; three reviewed build-only high entries from one advisory                                             | `output/dependency-audit.json`, `docs/dependency-review.json` |
| Type checking and lint              | Passed in the latest static run                                                                                                | Root validation output; configured commands below             |
| Portable artifact/hash/CSS checks   | Passed; version 0.2 artifact 1,601,843 bytes                                                                                   | `dist/release-manifest.json`, artifact verification output    |
| Clean-checkout reproducibility      | Fresh isolated `npm ci` validated the unchanged dependency set; two additional 0.2 builds matched using Node 24.11 / npm 11.18 | Reproducibility script output and SHA-256 below               |
| Dependency guard                    | Passed with the three constrained, reviewed build-only high entries                                                            | `output/dependency-audit.json`, `docs/dependency-review.json` |
| Final formatting and secret checks  | Source/tests/scripts formatting passed; high-confidence secret scan passed across 90 files                                     | `scripts/`, workflow logs                                     |

Coverage includes only `src/domain/**/*.ts`, `src/persistence/**/*.ts`, `src/portability/**/*.ts` and `src/reporting/**/*.ts`, as configured in `vitest.config.ts`. It excludes `src/services.ts`, React UI, styles, HTML and `src/legacy/controller.js`. The figures therefore support the core 95% line / 90% branch gate, **not** the plan's 90% line / 80% branch gate for all maintained application source. Browser workflow assertions are useful additional evidence but are not a measured replacement for that gate.

The full functional/performance validation artifact's SHA-256 is `53d4af84b75eb6648da9cacb396ed5fe5e45d4adaa8592cce84367f1f24e1e73`. The recorded matrix and benchmark samples apply to those exact bytes. Application version 0.2.0 adds only its release metadata stamp; removing the generated application-version meta tag reproduces the validated HTML exactly. Executable scripts, styles and application markup are unchanged.

Version **0.2.0** portable SHA-256 is `41156962d0cb6a5a1c7a3df877ce372587f408479ae6f4e38cc0886c323c5b9e` (**1,601,843 bytes**). Two additional builds matched that hash, artifact/version checks passed, all 289 unit/integration tests passed again, and installed Chrome/Edge direct-file offline smoke tests both passed. The document version remains 13 and the database layout remains 1.

The financial tests cover decimal input, long/short positions, lots, contracts, conversion, signed prices, fee allocation, frozen risk, fills, R-to-price previews and legacy partials. Modern boundary tests reject invalid account relationships, inconsistent original plans, oversized text/identities, malformed images and invalid correction history before legacy normalization can hide them. Repository tests cover recovery, duplicate identities, migration previews, idempotent snapshots, revision conflicts, missing/shared assets, aborted writes, quota failures, blocked upgrades and draft roots. Crypto/CSV tests cover round trips, malformed input and authentication failures. Tests use synthetic fixtures and simulated failure injection; they do not prove compatibility with every private historical export or every device/storage failure.

## Measured performance

Measurements use the exact portable SHA-256 recorded above, on Windows with an **Intel Core i7-13620H**, **15.71 GiB RAM**, and installed **Chrome 155.0.8059.40**. Each journal size has **20 measured navigations**, followed by an independent 20-run timing repeat. The fixture is deterministic synthetic demo data. Startup reads an already committed canonical journal with its checksum; initial migration and very large imports are separate workflows.

**Measurement protocol 2** forces exactly one full navigation per sample with an ignored query parameter, waits for explicit journal readiness, and records startup before the separate backup-integrity assertion. The earlier protocol could start the app twice and included that assertion in its first startup sample. These measurement defects were corrected explicitly rather than treating their overhead as application startup.

The test calculates p95 as the 19th sorted sample out of 20. Search timing includes the 120 ms debounce and visible-row detection. Input timing measures the synchronous handler. Reporting waits for the tagged dashboard result; factor/chart grouping paths are not all measured.

| Dataset / operation                              | Initial protocol-2 run |     Independent repeat | Plan threshold | Result |
| ------------------------------------------------ | ---------------------: | ---------------------: | -------------: | ------ |
| 1,000 trades — interactive startup               |             1,143.1 ms |             1,035.8 ms |      ≤1,500 ms | Passed |
| 10,000 trades — interactive startup              |             1,829.2 ms |             2,012.3 ms |      ≤3,000 ms | Passed |
| 10,000 trades — input handler                    |                 0.3 ms |                 0.4 ms |         ≤16 ms | Passed |
| 10,000 trades — filtered rows visible            |               200.9 ms |               215.2 ms |        ≤250 ms | Passed |
| 10,000 trades — dashboard reporting update       |               108.5 ms |               100.4 ms |        ≤500 ms | Passed |
| 10,000 trades + 200 images — interactive startup |             2,094.5 ms | Separate image fixture |      ≤3,000 ms | Passed |

The repeat's maximum startup samples were 1,000 trades: **1,070.8 ms**, 10,000 trades: **2,169.4 ms**. The specified p95 gate is not a worst-case guarantee. All raw samples are retained in `docs/benchmarks/windows-chrome-v2.json` and `windows-chrome-v2-repeat.json`.

The image fixture averages **49.71 KiB per image**. After five warm-up gallery cycles, 20 additional detail/gallery/list cycles produce five garbage-collected Chromium samples. Used JS heap changed from 102,446,768 to 102,609,232 bytes, about **158.7 KiB**; DOM nodes returned to 32,160. This passes the bounded-growth assertions of less than 5 MiB heap growth and 2,000 additional nodes. It is a short controlled Chromium test, not proof of zero growth during arbitrary long sessions.

**Baseline review:** the historical protocol-1 comparison failed before the measurement correction: 1,000-trade startup was 33.8% slower and dashboard reporting 20.1% slower than the initial report. Removing a duplicate full startup read improved image startup and large-journal loading, but a later protocol-1 comparison still failed. Both candidate reports are retained as `windows-chrome-protocol1-candidate.json` and `windows-chrome-protocol1-optimized.json`; the original `windows-chrome.json` is unchanged. Those historical failures are not relabeled as passes. Cross-protocol performance trends remain unestablished.

The protocol-2 baseline was selected after reviewing the measurement change, all absolute gates and the independent repeat. The repeat passes the unchanged **20%** regression limit against it. CI now uses this matching baseline; the comparator refuses different protocols, environment mismatches, missing datasets, incomplete/nonfinite samples and summaries inconsistent with raw observations. Future fixture/readiness changes require another explicit protocol/baseline review. Shared CI machines are not interchangeable with this workstation.

## Browser and layout compatibility

| Browser/origin                              | Intended support | Evidence status for final revision                                           |
| ------------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Windows installed Chrome, localhost         | Primary          | 42/42 functional cases passed; final performance runs recorded above         |
| Windows installed Chrome, `file://` offline | Primary          | Direct-file, disconnected navigation and no-network case passed              |
| Windows installed Edge, localhost           | Primary          | 42/42 functional cases passed                                                |
| Windows installed Edge, `file://` offline   | Primary          | Direct-file, disconnected navigation and no-network case passed              |
| Playwright Firefox, localhost               | Secondary        | 41 functional cases passed; direct-file case intentionally skipped           |
| Playwright WebKit, localhost                | Secondary        | 41 functional cases passed, including focus restoration; direct-file skipped |

Recorded browser versions: Chrome **155.0.8059.40**, Edge **155.0.4283.45**, Firefox **157.0**, WebKit **27.2**.

`playwright.config.ts` always defines Chromium, Firefox and WebKit projects. `EDGE_JOURNAL_SYSTEM_BROWSERS=1` adds installed Chrome and Edge. The direct-file test intentionally skips Firefox/WebKit, whose secondary support is localhost. Skips must be reported separately from passes.

Committed layout checks cover 320, 375, 768, 1024 and 1440 px on principal workflows, the original 16 routes at desktop/mobile widths, and a 200% CSS zoom case. Automated axe checks cover principal screens with WCAG A/AA tags. Password-dialog tests exercise tab containment, Escape and focus restoration. These do not replace browser zoom, full keyboard walkthroughs, assistive-technology testing or a manual WCAG 2.2 AA review.

## Six-phase delivery assessment

| Increment                                       | Implemented deliverables                                                                                                                                                                                                                                                   | Evidence / remaining completion boundary                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Recovery and migration safety                | Persistent read-only recovery states; ordinary writes blocked after rejected/unreadable sources; exact deduplicated originals; explicit migration acceptance; raw/full backup actions                                                                                      | Recovery and failure regression tests are committed. Legacy malformed, partial and large-journal browser checks exist. All four browser projects passed the relevant recovery and migration cases. The original informal checks were replaced by committed scenarios, not recovered as an independently preserved historical test suite.                                                  |
| 2. Maintained source and portable build         | Extracted source, maintained React controls, source styles/demo, strict TypeScript modules, lockfile, Vite single-file build, CSP, dependency notices, reproducibility and artifact scripts                                                                                | Opaque compiled UI runtime is removed. The readable JavaScript compatibility controller remains with `checkJs: false`; complete typed extraction/removal and whole-source coverage are unfinished. Fresh installed dependencies and two byte-identical builds were verified for the recorded hash.                                                                                        |
| 3. Transactions, assets and recovery            | Unified IndexedDB stores; in-transaction revision checks; atomic journal/assets/audit writes and imports; conflict notifications; draft restoration; reference-based collection; three automatic snapshots; pinned migration originals; storage management                 | Simulated abort/quota/concurrency/upgrade/asset tests pass in the recorded core run. Browser workflows exercise drafts, competing tabs and image backup/cleanup. The final browser workflows passed; synthetic failure injection is not a physical interruption test on every browser.                                                                                                    |
| 4. Financial model and corrections              | Canonical decimal strings; 34-digit half-even arithmetic; explicit units/multiplier/currencies/FX; frozen initial plans; price fills and R-to-price shortcut; currency-separated totals; correction reasons/previews/audit; legacy assumptions                             | Calculation and CSV/JSON fixtures verify supported linear economics. The R shortcut adds an ordinary editable price fill after confirmation using initial risk and actual realization FX. It blocks mixing old R rows with price fills; legacy bulk conversion is not implemented. Instrument specs are edited and snapshotted per trade; a reusable instrument-catalog screen is absent. |
| 5. Performance and accessibility                | Active-page rendering; bounded calculated/filter caches; 120 ms search debounce; tagged dashboard worker; pagination; lazy bounded thumbnail URLs; accessible dialogs; status/errors; Persian/RTL and Jalali compatibility                                                 | Recorded workstation performance gates passed. Some factor/chart grouping still runs in the compatibility controller on the main thread. The final automated layout, axe and dialog-keyboard matrix passed. Full manual accessibility and screen-reader acceptance remain open.                                                                                                           |
| 6. Backup privacy, boundaries and documentation | Versioned AES-GCM backups; bounded JSON/encrypted/CSV imports; parser worker; image/hash/relationship checks; atomic previews; CSV formula protection; offline CSP; inventories/notices; dependency/secret checks; recovery/calculation/contributor guides; CI definitions | Wrong-password/tamper and boundary tests are committed. Ordinary storage is intentionally unencrypted. The dependency review is constrained and expires. New-contributor and user recovery exercises remain manual release checks; configured CI is not evidence that a remote CI run has completed.                                                                                      |

Main/demo journals and hash routes remain supported. Current exports are document 13; synthetic compatibility fixtures exercise versions 1–12. Migration preserves exact legacy bytes, IDs and available image relationships and records explicit legacy financial assumptions. Retained originals are necessary because synthetic fixtures cannot cover every historical record shape. Old applications cannot interpret new fields; rollback needs a compatible original backup.

| Document versions | Committed compatibility fixture / behavior                                                           | Final browser evidence                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1–2               | Missing account arrays and old weekend mode; recover account association and retain closed economics | Passed in all four browser projects                           |
| 3–7               | Legacy fields/catalog/account associations with missing newer excursion/context fields               | Passed in all four browser projects                           |
| 8–9               | Missing timeframe-direction/confirmation-value additions                                             | Passed in all four browser projects                           |
| 10                | Missing confirmation-value additions                                                                 | Passed in all four browser projects                           |
| 11                | Last original format; explicit multiplier/FX 1 and unknown original stop/target retained             | Passed in all four browser projects                           |
| 12                | Transitional document; canonical adaptation to 13 with preserved economic meaning                    | Passed in all four browser projects                           |
| 13                | Full JSON/encrypted/CSV economic round trips, modern account relationships and correction validation | Passed in all four browser projects                           |
| Future versions   | Persistent unsupported/read-only state; no ordinary overwrite                                        | Core regression tests passed; no ordinary overwrite permitted |

## Security and dependency review

The recorded npm audit reports three high entries (`braces`, `micromatch`, `vite-plugin-singlefile`) arising from **one advisory**, GHSA-vfj7-8cjw-p6xm. These are development-only packages. The inspected plugin invokes pattern matching only when `inlinePattern.length` is nonzero; this build sets `inlinePattern: []`. The review therefore treats the vulnerable brace-parsing path as unreachable in this configured build. The packages are excluded from the portable runtime dependency inventory.

This is a documented constrained review, **not a zero-finding raw audit**. `npm run dependencies:check` verifies the dependency locations, advisory identity, plugin guard, configuration and review expiry, then fails on unreviewed high/critical findings or unavailable audit data. The review expires on **2027-01-13** and must be repeated sooner if the dependency chain or pattern configuration changes. See `docs/dependency-review.json`. The pull-request dependency-review action permits this advisory specifically; keep it aligned with the local guarded review.

The release CSP allows hashed bundled scripts, embedded workers, data fonts/images and blob images, while denying network connections, executable embeds and form posts. Dynamic layout styles still require inline styles. Imported text is rendered as text. Browser/profile access and malicious same-origin code remain outside backup encryption's protection; ordinary IndexedDB/localStorage are unencrypted by the agreed design. The journal checksum detects accidental inconsistency and is not an authentication mechanism.

## Reproduce and package the release

Run from a clean checkout using Node 24+ and the committed lockfile. Preserve command logs and generated reports from the **same final source revision** as the portable HTML.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run secrets:check
npm run dependencies:check
npm run verify:reproducible
npm run verify:artifact
npx playwright test --grep-invert "benchmark|image stress"
```

On Windows, set `EDGE_JOURNAL_SYSTEM_BROWSERS=1` to include installed Chrome/Edge. Run performance separately without competing builds/browser suites:

```powershell
$env:EDGE_JOURNAL_SYSTEM_BROWSERS = '1'
npx playwright test tests/browser/performance.spec.ts --project=chrome --workers=1
npx playwright test tests/browser/images-stress.spec.ts --project=chrome --workers=1
```

`npm run verify:reproducible` builds twice and compares SHA-256 bytes. `npm run verify:artifact` checks root/dist equality, embedded assets, CSP/notices and absence of dynamic evaluation. Retain its result; the script is evidence of a check, not evidence that it ran successfully on a particular revision.

The handoff bundle should include:

- Root `index.html`, `dist/release-manifest.json`, maintained source and the dependency lock.
- `THIRD-PARTY-NOTICES.txt` and `dist/dependency-inventory.json`.
- Unit/coverage output, exact functional browser totals/versions, failures/skips and traces where relevant.
- Both raw performance reports, workstation identity and any reviewed comparison baseline.
- Dependency-audit/review output and type/lint/format/secret/artifact/reproducibility logs.
- The user, architecture, calculation and recovery guides, including this release assessment.

Generated `output/`, `coverage/` and `dist/` are ignored by Git. Archive them with release evidence; their absence from a fresh checkout is expected. CI workflows in `.github/workflows/quality.yml` and `release-validation.yml` run the corresponding checks and retain artifacts. The optional workstation job requires the configured self-hosted Windows runner and a matching reviewed baseline.

## Manual release checks still required

- [x] Record final browser projects and pass/fail/skip totals, including localhost and Windows direct-file behavior. The frozen artifact passed all 166 applicable cases without retries.
- [ ] Walk every form, menu, modal, import preview, recovery action and destructive action using keyboard only. Verify focus order, visible focus, Escape/cancel and focus restoration in RTL.
- [ ] Test Persian content with a screen reader; verify labels, validation errors, save/conflict/recovery announcements, table headers and modal announcements. Record screen reader/browser versions and findings.
- [ ] Verify actual browser 200% zoom, narrow layouts, reduced motion and high-contrast/contrast behavior with representative long Persian labels and import errors.
- [ ] Perform the synthetic recovery exercise in `docs/recovery.md`, including external full-backup verification, encrypted restore and a quota/unavailable-storage read-only path.
- [ ] Have a contributor reproduce the portable artifact from a clean checkout and follow the release instructions without undocumented setup.
- [ ] Review real, anonymized versions 1–11 backups where available; retain originals and record fixture provenance. Synthetic adapters passing are not blanket historical certification.
- [ ] Confirm all known findings in the reviewed scope have regression coverage and resolve any discovered P1/P2 issues before approval. This report does not attest that a final exhaustive defect review is complete.

## Strict provisional rating

These are engineering judgments for the reviewed implementation, not guarantees or a certification. They are deliberately below the proposed maximum while the stated gates remain open. Reassess after the remaining manual and architectural gates.

| Aspect               | Provisional /10 | Reason                                                                                                                                                                             |
| -------------------- | --------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Features             |             8.5 | Broad original workflows plus explicit linear markets/fills/corrections and an R-to-fill preview; a reusable instrument catalog remains incomplete.                                |
| UI and localization  |             8.0 | Persian/RTL behavior and accessibility checks are maintained; full manual keyboard/screen-reader/zoom acceptance has not been demonstrated.                                        |
| Financial logic      |             8.5 | Exact decimal arithmetic and independent expected fixtures address units, conversions, fees and frozen risk; historical assumptions and real-backup review remain explicit limits. |
| Data durability      |             9.0 | Atomic revisions, guarded recovery, image repair, snapshots and isolated drafts pass core and browser checks; independent external recovery remains unverified.                    |
| Architecture         |             7.5 | Domain/persistence/import/reporting modules and maintained builds are clear; a large unchecked compatibility controller and partial main-thread reporting remain.                  |
| Testing              |             8.5 | Strong measured core coverage and 166 passing browser cases; full-source coverage and manual acceptance remain unfinished.                                                         |
| Performance          |             8.5 | Absolute workstation gates and the corrected-protocol repeat pass; historical comparison failures and unmeasured factor paths limit the evidence.                                  |
| Security and privacy |             8.5 | Authenticated backup encryption, bounded imports and offline CSP are tested; local storage remains accessible by design and a build-only advisory requires ongoing review.         |
| Documentation        |             8.5 | Architecture, calculations, recovery and contributor workflows are documented; independent contributor/user exercises remain unverified.                                           |

The unweighted provisional average is **8.4/10**. A 9–9.5 overall rating is not justified by the current evidence. The next review should prioritize the remaining acceptance gates, rather than increasing scores solely because the new infrastructure exists.
