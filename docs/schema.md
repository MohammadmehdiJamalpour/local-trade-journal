# Version-13 document and storage schema

Authoritative interfaces are in `src/domain/types.ts`; boundary validation is in `src/domain/economics.ts`, `src/domain/boundaries.ts`, `src/services.ts` and the repository. This guide explains the persisted contract and does not replace executable validation.

Application version 0.2.0, document version 13 and IndexedDB layout version 1 are independent. Versions 1–11 and transitional document 12 enter through explicit compatibility normalization. Future document versions are read-only/unsupported and must not be rewritten by an older app.

## Full JSON backup

| Field         | Meaning                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `version`     | Document format; current export is `13`                                                        |
| `settings`    | Journal preferences, including default/display currency and weekend conventions                |
| `accounts`    | Stable IDs, names, account currencies, balances/risk defaults, descriptions and archive status |
| `options`     | Catalog arrays keyed by category; identities and historical selections remain stable           |
| `trades`      | Trade records, instrument and initial-plan snapshots, fills, context and image references      |
| `imageAssets` | Referenced image bytes as permitted MIME/base64 data URLs, with matching metadata              |
| `auditEvents` | Correction events with ID, trade ID, reason, time and complete before/after records            |
| `dataMode`    | Export source (`live` or `demo`); restore targets the currently selected journal explicitly    |
| `revision`    | Source committed revision; not permission to overwrite a different current revision            |
| `exportedAt`  | Export time; release artifact reproducibility is independent of user backup timestamps         |

The export reads records, image references and audit events from one repository transaction/revision. Image bytes are verified before serialization. Drafts, retained recovery snapshots and old raw localStorage sources are not included in an ordinary full backup; use their explicit raw/snapshot management actions when needed.

Import checks the file limit before reading, validates supported versions/types/IDs/relationships/numeric limits, checks images and audit history, and presents a preview. JSON replacement commits records/assets/audit atomically after a revision recheck. CSV is an append exchange format; it preserves the exported economic/context columns but does not carry image bytes, complete catalogs or correction history. It is not a full backup.

Version-13 text/identity validation runs before compatibility normalization, so invalid values cannot become accepted through truncation. Trade/account IDs are at most 100 characters, symbols 24, entry reasons 1,200, exit reasons/lessons 1,000, screenshot references 500 and notes 3,000. Account relationships and currency labels must agree. Malformed persisted corrections are quarantined with their originals rather than silently discarded; imported correction envelopes must validate before replacement.

## Economic fields

All financial numbers are canonical decimal **strings**, rather than JSON binary-floating-point numbers. IDs, enum values and booleans retain their own types. Core arithmetic uses 34 significant digits and half-even rounding; display rounding does not rewrite stored inputs.

| Record                 | Fields and semantics                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account                | `currency`, `accountBalance`, `riskMode`, `riskPercent`, `fixedRisk`, `archived`                                                                                          |
| Instrument             | `id`, `symbol`, `model: "linear"`, `quoteCurrency`, `quantityUnit: "units" \| "lots" \| "contracts"`, `multiplier`, `priceIncrement`, `quantityIncrement`, `signedPrices` |
| Executed original plan | `entry`, nullable original `stop`/`target`, `quantity`, `risk`, `reward`, `rr`, `fxRate`, instrument snapshot, `source`                                                   |
| Trade conversion/costs | `entryFxRate`, `exitFxRate`, `feesCurrency`, `feeFxRate`, `fees`; `accountCurrency` retains the calculation denomination                                                  |
| Price fill             | Stable `id`, `price`, `quantity`, `fxRate`, `fees`, `feeFxRate`, optional `feeCurrency`, `date`, `time`                                                                   |
| Legacy partial         | Existing R/percent fields retain their historical economics; do not mix them with price fills for the same exits                                                          |

The plan source is `recorded` or `legacy-assumption`. Missing historic original stop/target remain `null`; they are not reconstructed from later management values. Multiplier 1/conversion 1 are explicit legacy assumptions. Executed-plan changes require a reason and audited correction; moving a current stop/target is a separate management action. Account currencies with trading history cannot be relabeled as a shortcut for currency conversion.

Fill dates use ISO Gregorian `YYYY-MM-DD` and times `HH:mm` when provided. Main form dates remain Persian/Jalali inputs normalized to ISO dates. Conversion rates always mean one source-currency unit in account-currency units. See [calculation conventions](calculations.md) for equations, fees and supported/unsupported models.

## Images, drafts and snapshots

An image reference contains `id`, attachment `name`, MIME `type`, byte `size`, `width` and `height`. Stored assets add SHA-256 `hash` and binary bytes. Current attachment references have names; a separate caption field/editor is not implemented. Permitted imported MIME types are PNG, JPEG, WebP and GIF; decoded dimensions/content and declared relationships must agree. New asset IDs use `img-<sha256>`; legacy IDs are retained.

Image bytes are normally Blobs. A narrowly detected Windows WebKit Blob-storage failure aborts and retries with ArrayBuffer storage; reads normalize back to a Blob. Assets remain referenced by both journals, drafts or retained snapshots. Removing one attachment cannot collect an image still referenced elsewhere.

Drafts store per-tab IDs, mode, form payload, asset roots, generation and update time. They autosave after 750 ms inactivity and are local recovery aids. A Web Lock owns the write ID for the document lifetime, preventing cloned sessionStorage IDs from sharing a live editor's draft. If Web Locks are unavailable/refused, a fresh load ID is used while the prior ID remains a read-only restoration source. Automatic snapshots retain the pre-destructive journal, its asset IDs and audit history; only the latest three automatic snapshots per journal are retained. Migration originals are pinned/deduplicated by source hash and include exact raw source plus rejection information. They remain until explicitly removed.

## IndexedDB layout and concurrency

Database `edge-journal`, layout 1, contains `journals`, `accounts`, `catalogs`, `trades`, `assets`, `drafts`, `audit` and `snapshots`. Entity keys include journal mode; assets are shared by identity. The journal metadata stores document version, revision, preferences, update time and an integrity checksum.

Commits compare the expected revision inside the write transaction. Changed entities, assets, corrections and revision commit together; aborted transactions leave the previous revision. A caller sees success only after transaction completion. A stale tab retains its draft and receives a typed conflict. Recovery/quota/validation/storage failures remain distinct. BroadcastChannel notifies other tabs, with a small storage-event fallback.

The checksum detects accidental record inconsistency; it is not authenticated data or protection against malicious same-origin code. It allows a validated unchanged revision to avoid repeated expensive financial normalization. Loading statuses are `empty`, `ready`, `recovery-required`, `unsupported-version` and `storage-unavailable`.

## Encrypted envelope

Encrypted backups wrap the full JSON in a strict envelope:

```json
{
  "format": "edge-journal-encrypted",
  "version": 1,
  "cipher": "AES-256-GCM",
  "kdf": "PBKDF2-SHA-256",
  "iterations": 600000,
  "salt": "<base64: 16 random bytes>",
  "iv": "<base64: 12 random bytes>",
  "ciphertext": "<base64: ciphertext and 128-bit authentication tag>"
}
```

The fixed format/version/cipher/KDF/iteration header is authenticated as additional data. Passwords must have at least 12 characters when creating a backup. A fresh salt and IV are generated for every export. Unsupported parameters, wrong passwords or authentication failures never trigger a journal write. Passwords/derived keys stay in memory; ordinary local journal storage remains unencrypted. The 256 MiB encrypted-file limit includes the envelope/base64 expansion.
