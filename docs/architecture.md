# Architecture and data contracts

## Delivery and boundaries

Vite builds `src/index.html` with maintained React controls and the readable extracted controller. `vite-plugin-singlefile` inlines scripts/styles and embedded workers; the font is a data URI. The release script adds actual dependency notices, hashes executable scripts into an early CSP and copies identical bytes to the root artifact. No runtime requests are required.

Strict TypeScript modules isolate domain calculations, the repository, imports, encryption, reporting, React controls and orchestration. `src/legacy/controller.js` retains original form/catalog/date/navigation/report behavior. It is JavaScript with `checkJs: false`, the remaining static-checking boundary. The opaque compiled UI runtime is removed. Controller functions should move into typed modules by responsibility as they are changed. Migrated React roots own their DOM.

`services.ts` bridges asynchronous commits, canonical economic values, numeric display views, drafts, recovery, files and workers. Weak maps retain exact persisted records behind UI views; unchanged inputs must not be reconstructed from rounded UI numbers. A failed commit never replaces committed state. Results are cached by immutable trade object/revision. Filtered selectors are bounded and invalidated by journal revision/filter signature. Only the active page renders.

## Versions

| Version             | Meaning                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| App `0.2.0`         | Release behavior/dependencies                                                                       |
| Database layout `1` | Object-store/index topology                                                                         |
| Document `12`       | Accepted transitional storage document with legacy economic meaning                                 |
| Document `13`       | Decimal strings, currencies, instrument snapshots, frozen plans, fills, conversions and corrections |

Current exports are version 13. Versions 1–11 pass through compatibility normalization for settings/weekend conventions, catalog identities/labels, recovered accounts, dates, lists, context and images, then canonical economic adaptation. Version 12 uses the same economic bridge. Synthetic fixtures do not prove every historical private export shape; retain real originals during migration.

Trade fields add `instrument`, `initialPlan`, `fills`, `accountCurrency`, `entryFxRate`, `exitFxRate`, `feeFxRate`, `feesCurrency`. Financial inputs/results persist as strings. `initialPlan.source` is `recorded` or `legacy-assumption`; unknown historical initial stop/target remain null. Instrument specifications are currently edited/snapshotted per trade; there is no separate reusable instrument-catalog screen yet.

See the [document/storage schema](schema.md) for exported fields, image/draft/snapshot contracts and the encrypted envelope.

## Repository

`JournalRepository` exposes `loadJournal`, `commit`, `previewImport`, `commitImport`, `exportSnapshot`, `recover`, and draft/asset/audit/snapshot management. File decoding and the explicit preview dialog belong to `services.ts`; the low-level repository preview accepts parsed data, not a File.

| Store                    | Key                         | Contents                                                              |
| ------------------------ | --------------------------- | --------------------------------------------------------------------- |
| journals                 | mode                        | schema, settings, revision, integrity checksum                        |
| accounts/catalogs/trades | mode + ID                   | changed entities                                                      |
| assets                   | asset ID                    | metadata, SHA-256, image bytes                                        |
| drafts                   | per-tab UUID                | form payload and asset roots                                          |
| audit                    | event UUID                  | mode, trade ID, reason, before/after values                           |
| snapshots                | source hash / mode+revision | exact original or pre-destructive journal, asset roots, audit history |

Write transactions compare expected revision and commit entities/assets/audit/metadata together. The UI awaits completion. Conflicts preserve drafts and require inspection/reload; they are not silently merged. BroadcastChannel has a small storage-event fallback. A checksum avoids expensive normalization on unchanged committed revisions. It detects accidental corruption, not malicious same-origin code or authenticated data.

Startup checks journal presence using only the metadata key before choosing a legacy source. It then reads and validates the saved revision once; a presence check is never treated as validation. Full snapshot exports queue independent entity/audit reads together and referenced asset reads together within the same read transaction, preserving revision consistency without sequential request overhead.

New uploads use `img-<sha256>` identities. Legacy IDs stay stable. Attachment names are on references. Primary bytes are Blobs. Windows WebKit's specific “preparing Blob/File data” failure is retried after abort with ArrayBuffer bytes; reads restore a Blob. Unrelated/quota failures do not invoke this fallback. Full exports verify image hashes. Collection retains roots from both journals, drafts and snapshots.

Drafts save after 750 ms inactivity. Reload drafts are captured before controller initialization can reset them. Uploaded images are pinned by the draft. Three automatic snapshots precede deletion/replacement/correction; exact migration originals stay pinned until explicit deletion. Legacy keys remain until explicit cleanup; the old image database is retained.

`src/persistence/draftSession.ts` uses Web Locks to own a draft-session ID for the document lifetime. A tab with cloned sessionStorage cannot reuse an ID owned by a live editor. Without Web Locks, each load gets a fresh write ID and retains the prior ID only as a restoration source; restoring does not silently overwrite the older source draft. Failure to retain sessionStorage still results in an isolated in-memory editor ID.

An explicitly accepted full-backup replacement can repair corrupted stored image bytes when the validated backup matches the surviving asset identity/metadata. A genuinely conflicting asset identity still aborts without changing the journal.

## Workers and performance

Search inputs update immediately; filtering waits 120 ms. Lists render one page, with lazy bounded thumbnails. At 2,000 filtered trades, an embedded reporting worker uses revision/request IDs and rejects stale responses. Dashboard metrics consume its results. Compatibility factor/chart grouping remains in the extracted controller and uses cached trades; further worker migration remains architectural work.

Imports over 1 MiB use an embedded parser worker. Validation/hashing/decoding/encryption happen before write transactions. CSV commits the accepted append set; JSON replaces one revision atomically including images/audit. Import limits apply before reading the file.

## Security boundary

Local data is unencrypted by design. Backup encryption authenticates format metadata; passwords/keys remain in memory, and dialog state clears on close. CSP blocks connections, executable embeds, form posts and unapproved scripts. Existing dynamic layout styles require inline styles. Imported text is text. Meta CSP cannot provide HTTP-only `frame-ancestors` and does not protect against device/profile access.
