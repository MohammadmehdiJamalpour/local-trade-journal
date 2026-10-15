# Changelog

## 0.2.0 — 2026-10-15

This version modernizes the portable Persian/RTL journal while retaining existing routes, demo/main separation and legacy import support. Document version is 13; IndexedDB layout is 1. Export a full backup before accepting a legacy migration. Older applications cannot read document 13.

- Add transactional IndexedDB storage, revision conflict checks, persistent recovery states, exact migration originals, snapshots and isolated autosaved drafts.
- Introduce decimal financial calculations, explicit linear-market instrument specifications and currency conversion, frozen initial risk, price-based partial fills and audited corrections.
- Add password-encrypted backups, bounded import previews, image validation and retention, CSV protections and an offline Content Security Policy.
- Recover maintained source and React controls, a reproducible single-file build, dependency notices, automated tests and CI definitions.
- Improve active-page rendering, reporting workers, responsive layouts and accessible dialogs while retaining Persian dates and number entry.

Recorded validation: 289 unit/integration passes, 166 functional browser passes and two intentional secondary-browser direct-file skips. Core coverage is 98.94% lines and 94.08% branches. Workstation performance and image-memory checks passed under the documented protocol, including an independent timing repeat.

The version stamp changes release metadata; executable scripts, styles and application markup retain the validated behavior. See [release validation](docs/release-validation.md) for exact artifact hashes, historical performance comparisons and remaining limits. The strict provisional rating is 8.4/10. Complete controller extraction, whole-application coverage and manual accessibility/recovery acceptance remain open.
