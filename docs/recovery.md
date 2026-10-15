# Backup, upgrade and recovery

## External backups

Use **تنظیمات → داده‌ها** to export ordinary JSON or **پشتیبان رمزدار**. Both contain one committed revision, including accounts, catalogs, trades, images and corrections. Wait for saves first. Drafts are not portable backups. Verify the downloaded file and restore it into a separate profile/origin before removing the original.

Encrypted exports require 12 password characters. AES-256-GCM authenticates content and format metadata; PBKDF2-SHA-256 uses 600,000 iterations, a fresh 16-byte salt and 12-byte IV. Passwords are not saved or recoverable. Ordinary local storage remains unencrypted.

Limits: JSON/encrypted file 256 MiB including envelope/base64 overhead; CSV 64 MiB; 100,000 records; six images per trade; 2 MiB per stored image. Uploaded source images may reach 20 MiB before bounded decoding/resizing. Encrypted plaintext capacity is smaller than 256 MiB because of base64 expansion. CSV preserves economic fields but omits image bytes/audit events; use JSON for complete recovery.

## Upgrade

1. Keep the old HTML and an old full backup outside the browser.
2. Open the new app in the same browser/profile/origin. Healthy legacy data shows **ارتقای ذخیره‌سازی ژورنال** with counts and a pre-upgrade full-backup action.
3. Download and verify that backup. The separate raw action returns exact localStorage bytes.
4. Accept the preview and choose **ارتقا و ادامه**. Records and available images migrate atomically, preserving relationships/IDs.
5. Export/restore a version-13 full backup in another profile. Check accounts, sample trades, currencies, fills and images.

Exact legacy sources are deduplicated in pinned snapshots. Old journal keys/image database remain. Storage cleanup can explicitly remove journal keys after preserving exact contents; it does not automatically delete the old image database. Old apps cannot read version 13. Rollback needs a compatible old full backup and must not discard new fields silently.

## Read-only recovery

Malformed JSON, rejected records, duplicate IDs, missing images or unsupported versions block ordinary saves. The persistent panel lists accepted/rejected counts/reasons. Settings/account/CSV/trade saves cannot replace a blocked source.

- Download the exact original, even malformed JSON, and retain it unchanged.
- Prefer a verified full backup. Replacement requires an explicit preview and commits records/images/audit atomically.
- A matching verified backup can repair damaged image bytes whose stored asset identity/metadata survived. Conflicting image identities still reject the replacement; missing or corrupt backup images cannot establish a full recovery.
- If no complete backup exists, review accepted records and missing images. Explicit partial recovery creates the accepted subset while retaining the original rejected content in a pinned source.
- If preservation fails from quota/unavailable storage, stay read-only and export raw data. The app never overwrites a source to make room.
- Future formats require a compatible app; do not recover them through an older schema.

Three automatic snapshots precede destructive changes. **بررسی فضا و نسخه‌های بازیابی** lists/restores them and pinned originals. Deleting a snapshot frees images only when no journal/draft/snapshot references them. Browser origin-wide storage estimates are approximate.

## Storage and tabs

Only a completed transaction produces **ذخیره شد**. Quota, blocked upgrades, closed connections and failed writes show persistent errors. Close old tabs for blocked upgrades, then reload. Persistent storage may be declined and never replaces external backups. Private mode, policies and file origins may lack durable storage.

A stale tab retains its draft and cannot overwrite a newer revision. Reload, restore the draft when offered, inspect the newer record and reapply intended edits. Draft autosave waits 750 ms inactivity; immediate page closure does not guarantee draft persistence. Changing browser/profile/host/port/file location may select different storage. Transfer using a full backup.

Draft ownership is separate from journal revision checks. Web Locks prevent a duplicated tab's cloned sessionStorage ID from writing another live editor's draft. Where Web Locks are unavailable, each load writes a fresh draft ID and offers the previous draft as a restoration source while retaining its original. This avoids silently replacing one editor's draft with another's initialization.

## Worked exercise — synthetic profile only

1. Export the demo as full JSON and note its trade count/image.
2. Import into main in an isolated profile. Verify count, accounts, economics and image.
3. Export encrypted, then restore elsewhere. A wrong password must leave the existing revision/count unchanged; the right password must show a replacement preview.
4. Edit a synthetic trade, wait one second, reload, restore the draft, save and verify the persistent saved status.
5. Delete a synthetic trade and restore the automatic pre-delete snapshot.
6. On an unused origin/profile with no IndexedDB journal, set localStorage `edge-journal:v3` to `{broken` and reload. Verify read-only recovery and exact raw download; a settings save must leave the key unchanged.

Do not run corruption exercises against a real journal or clear browser data without a verified external backup.
