# Calculation conventions

Financial values persist as canonical decimal strings. Arithmetic uses 34 significant digits and half-even rounding. Display rounding does not replace stored inputs. Numeric input is limited to 128 characters, finite values and exponents within ±100.

## Instruments, units and conversion

Supported: linear crypto units, stock shares, forex lots and linear futures contracts. Explicitly define quote/P&L currency, quantity unit, multiplier, price/quantity increments and signed-price permission. Symbol names never imply contract specifications. Zero increments mean unrestricted decimal entry. Zero/negative prices require permission.

For longs, sign = +1; for shorts, sign = −1:

```text
quote gross P&L = sign × (exit − entry) × executed quantity × multiplier
account gross P&L = quote gross P&L × that realization's conversion rate
net P&L = summed account gross − converted position fee − converted fill fees
initial risk = abs(entry − initial stop) × original quantity × multiplier × initial FX
initial reward = abs(initial target − entry) × original quantity × multiplier × initial FX
planned R/R = initial reward / initial risk
realized R = net P&L / saved initial account risk
maximum touched R = gross account-currency MFE / saved initial account risk
```

Conversion means **one unit of source currency in account-currency units**. Record rates manually. Position fees have a named currency/rate; each fill fee has its own conversion rate. Use 1 only when appropriate. No live conversions or inferred tick values are supplied.

| Example               | Inputs                                                                                         | Expected result    |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| Long units            | 10 units, 100 → 120, multiplier/FX 1                                                           | 200 gross          |
| Short units           | 10 units, 100 → 80, multiplier/FX 1                                                            | 200 gross          |
| Forex lots            | 0.1 lots, 160 → 161 JPY, multiplier 100,000, exit FX .0065 USD/JPY                             | 65 USD gross       |
| Forex initial risk    | Same entry/quantity; stop 159; initial FX .006                                                 | 60 USD risk        |
| Signed linear futures | 2 contracts, −5 → 0, multiplier 50; fee 1 converted at 2                                       | 500 gross, 498 net |
| Partial exits         | 10 units at 100; 5 exit at 120 FX 2; remaining 5 at 110 FX 3; position fee 10; fill fee 3 FX 2 | 350 gross, 334 net |

## Execution, fills and corrections

Execution freezes initial entry, quantity, instrument, risk/reward/RR and conversion assumptions. Moving the current stop to breakeven/profit does not rewrite risk. Changing original execution is an audited correction.

Price fills record price, quantity, FX, fees and optional timestamp. Total exits cannot exceed original quantity. Fully exited positions must be closed and need no redundant final price. The final exit applies only to remaining quantity. Position fees are deducted once; fill fees are additional.

Legacy “exit at R” rows preserve their R/percent economics and show equivalent price/quantity previews. Do not enter an exit in both systems. The **میان‌بر خروج در R** action takes an R level and an explicit fill quantity, derives a price using saved initial account risk, original quantity, multiplier and the entered realization FX, and asks for preview confirmation. Acceptance adds an ordinary editable price fill; verify its actual execution price, timestamp and fees before saving. It does not bulk-convert old legacy R rows, and blocks a mixed legacy/new exit system. New fill dates are explicitly Gregorian; main trade dates retain Jalali entry.

```text
shortcut price = entry + sign × R × saved initial account risk
                         / (original quantity × multiplier × realization FX)
```

The R level describes the full-position price distance before fees. A partial quantity realizes only its proportion of that gross R; final net R also reflects fees. A derived price that violates the instrument increment must be entered as the actual execution price instead of silently rounded.

Original-execution and closed-economic corrections require a reason. The preview shows net P&L, R and outcome changes; immutable before/after events commit with the trade and travel in full JSON backups. Existing fill edits/removal also require a reason. Adding a new fill on an open position is management. The editor displays correction history.

## History and reports

Legacy records retain their currency label, multiplier 1 and FX 1 unless newer explicit values exist. Existing initial risk/reward/RR are retained as legacy assumptions. Missing historical original stop/target remain null. Reviewing these flags never changes history automatically; corrections require actual original-plan inputs.

When a legacy executed record has no saved risk baseline, adaptation retains the former calculation meaning using its available legacy values, then marks that numeric baseline as `legacy-assumption`. Original stop/target still remain unknown (`null`); the derived number is not evidence that those were the original execution levels.

Win rate = wins / (wins + losses), excluding breakevens/open/planned positions. Open partial results are labeled separately. Monetary totals are grouped by currency; pooled monetary profit factor/excursion averages are suppressed for mixed-currency samples. Counts, win rate and R can be combined. Multi-choice factor groups overlap.

Unsupported: options, inverse/nonlinear contracts, taxes, broker reconciliation, live marks and consolidated multi-currency equity.
