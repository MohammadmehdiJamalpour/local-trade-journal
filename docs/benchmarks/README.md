# Windows workstation benchmarks

Recorded on 2026-10-15 using the production portable artifact on Windows, Intel Core i7-13620H, 15.71 GiB RAM and installed Chrome 155.0.8059.40.

- `windows-chrome-v2.json` is the reviewed protocol-2 timing baseline used by the optional workstation CI comparison. `windows-chrome-v2-repeat.json` retains an independent 20-run repeat; all absolute gates and the unchanged 20% comparison passed.
- `windows-chrome-images-v2.json` retains the separate 10,000-trade/200-image startup and navigation-memory run. Average image size is 49.71 KiB. Its assertions run independently of the timing comparison.
- `windows-chrome.json` and `windows-chrome-images.json` preserve the initial protocol-1 reports. `windows-chrome-protocol1-candidate.json` and `windows-chrome-protocol1-optimized.json` preserve the subsequent failed historical comparisons. None was overwritten or relabeled as a pass.

Protocol 2 forces exactly one full navigation per sample and records startup before the separate exported-fixture assertion. Protocol 1 could initialize twice between samples and included the first backup-integrity assertion in startup time. Its 10.47-second maximum therefore cannot be interpreted as application startup alone. The measurement correction is the reason for selecting a new baseline; the greater-than-20% historical failures remain disclosed in [release validation](../release-validation.md). The startup optimization also removes a duplicate full journal read, without bypassing validation.

Both protocol-2 timing runs and the image run identify portable SHA-256 `53d4af84b75eb6648da9cacb396ed5fe5e45d4adaa8592cce84367f1f24e1e73`. These runs predate the application 0.2.0 metadata stamp; see release validation for the byte-equivalence check and current release hash. This evidence does not establish manual accessibility acceptance, a historical cross-protocol speedup or completion of the full modernization plan.

Run benchmarks without concurrent builds or browser suites:

```powershell
$env:EDGE_JOURNAL_SYSTEM_BROWSERS = '1'
npx playwright test tests/browser/performance.spec.ts tests/browser/images-stress.spec.ts --project=chrome --workers=1
node scripts/compare-performance.mjs docs/benchmarks/windows-chrome-v2.json output/performance/report.json
```

The comparator requires matching protocols, platform, CPU and browser major version, both datasets, 20 valid raw observations per metric and summaries matching their calculated p95. It fails on a measured p95 regression above 20%. Each benchmark also asserts its absolute thresholds. The image-stress test asserts startup p95 ≤3 seconds and bounded heap/DOM growth after repeated gallery navigation.

When hardware, browser major version, fixtures, startup criteria or measurement code changes, review the new raw samples and establish a new baseline explicitly. Do not replace the baseline automatically after a failed comparison. Record the reason in the release evidence. CI uses a self-hosted Windows runner labeled `edge-journal-benchmark`; configuring that runner and providing installed Chrome are deployment prerequisites for the optional job.
