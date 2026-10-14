# Factor filters and peak P&L

Open `index.html` and select **تحلیل عملکرد** in the sidebar (or open **فهرست** on mobile). Use the **فاکتورها**, **زمان**, **رفتار**, **R لمس‌شده**, and **جدول مقایسه** tabs for focused reports.

**بیشترین R لمس‌شده** is the recorded maximum unrealized profit divided by the trade’s saved initial risk. For example, a $300 peak profit on $100 initial risk means 3R was touched, regardless of the final result. It uses gross peak profit before fees and keeps the initial-risk basis when the stop or target changes. Missing observations remain unknown; recorded zero is 0R.

The new **پوزیشن تا چند R پیش رفته؟** table counts positions that reached at least 0.5R, 1R, 2R, 3R and higher. Its percentages use executed trades with recorded peak profit and valid initial risk; open positions are shown separately from closed ones. Levels are cumulative, so a 3R trade is also in the 1R and 2R rows. Reach percentage differs from closed win rate.

Use **حداقل R لمس‌شده** for a minimum threshold, or **بیشترین R لمس‌شده** in other factor filters for a nonoverlapping range. Both combine with setups, volume, trend and other filters. Group the comparison table by **بیشترین R لمس‌شده** to compare outcomes by range. Exact trade values, a form preview, filtered average/best values and a derived CSV column are also available.

To attach trade images, edit a trade and expand **یادداشت و مدرک**. Drag image files into the form, paste a copied image with **Ctrl + V** while focused in the form, or click **انتخاب تصویر**. Save the trade to attach them. Each trade supports up to six images; row thumbnails open the full image gallery. Use **حذف از معامله** to detach an image, then save the trade.

Images are resized to a maximum of 2000 pixels and stored locally in the browser. Full JSON backups include the image data and restore it alongside the trades; CSV contains trade data without image attachments. Keep the JSON backup when moving the journal to another browser or location.

To describe a setup or any managed option, open **ستاپ‌ها و فاکتورها**, select its category, enter its optional description and click **ذخیره**. New options also have a description box. Descriptions appear beside choices and are included in full JSON backups.

Setups, emotional states, mistakes, timeframes and sessions now allow multiple selections. Open the choice panel and tick each applicable option; search matches names and descriptions. `ثبت نشده` and `بدون اشتباه` are exclusive defaults. Previous single selections carry forward automatically. Up to 25 choices can be selected per category.

Each factor filter matches any trade containing that option, including its second or later selections. A trade appears under every selected option when grouped, while the overall totals count the trade once. JSON and CSV preserve all selections; use JSON to preserve complete option catalogs and descriptions too.

- Select **حجم** to see the win rate and average R/R of trades tagged with volume.
- Add **هم‌جهتی روند تایم بالاتر** and choose **همهٔ انتخابی‌ها (AND)** to require both confirmations.
- Choose **حداقل یکی (OR)** to include either confirmation, or **بدون انتخابی‌ها (NOT)** to exclude every selected tag.
- **فقط معاملات بدون هیچ تأییدیه** selects records with an empty confirmation list.
- Expand **فیلتر سایر فاکتورها** for setup, timeframe, emotion, plan adherence, mistakes, setup quality, confidence, market, weekday, weekend and entry-time filters. Different factors combine with AND.
- The comparison table supports grouping by each factor. Its **فیلتر** and **بدون این** buttons apply the corresponding group condition.

The summary shows the closed sample size, win rate, average initial planned R/R, mean realized R, realized net P&L and recorded excursion averages. Open and planned positions are counted separately. Win rate excludes breakevens; a warning appears when filtering by the outcome itself.

To record peak P&L, edit an open or closed position and expand **بیشترین سود و زیان باز**:

- **بیشترین سود باز (MFE)**: highest gross open profit reached during that trade.
- **بیشترین زیان باز (MAE)**: deepest gross open loss, entered as a positive magnitude.
- Enter amounts in the account currency, before fees. Zero means an observed zero; blank means unknown. The app does not obtain market prices automatically.
- Realized net P&L is calculated from entry, exit, quantity, direction and total fees. Its form preview updates as those inputs change.

Excursion averages use only recorded values and show the number of observations. Individual peak amounts are never summed into an account peak. Live records from older backups gain unknown excursion fields; fabricated demo values are never added to the live journal.

The 100-position synthetic dataset now includes peak P&L examples. In that dataset, volume-tagged trades have 22 closed positions, a 55% win rate and 2.25 average planned R/R. These are software-test results, not market evidence.

Verified: 36 normalization cases, confirmation combinations, every added factor filter, exact symbol group filtering, excursion editing, persistence, JSON/CSV round trips, v4 migration and mobile layout.


## Recover an earlier custom list

Custom setups and factors are saved in the browser for the page where they were created. On the original page that still shows them, click **خروجی JSON** now. In the updated journal, open **ستاپ‌ها و فاکتورها** and choose **بازیابی ستاپ‌ها و فاکتورها از JSON**. This merges only option catalogs; it keeps the current trades and account settings, and downloads a catalog backup before changing anything. Unused active catalog options now appear in factor filters. Newer changes from another updated tab are protected against stale writes.

## Open an individual position

Click a trade's symbol in its table row or mobile card to open its detail page. The page groups prices, entry/exit dates, initial risk, realized P&L and R, maximum R reached, peak open profit/loss, every selected setup and factor with descriptions, notes, lessons and images. Click an attached image to enlarge it and move through the gallery.

**بیشترین R لمس‌شده** uses that position's highest recorded unrealized profit divided by its saved initial risk. A blank observation remains unknown; a recorded zero stays zero. Open positions show observations up to the latest entry, while planned positions have no realized result or reached R.

Use **ویرایش پوزیشن** to edit the position, **ثبت نتیجه / بستن** to record its exit, or **بازگشت به معاملات** to return to the list with its filters preserved. Each position's page link can be reopened or refreshed in the same journal.

## Multiple accounts

Open **حساب‌ها** in the sidebar. Use the inline account selector/editor to add or rename an account, describe it, and set its balance and risk defaults. Existing positions are preserved in **حساب اصلی**. Archive keeps an account's history in the overall reports and allows reviewing or editing its existing positions; restore the account before adding new positions to it.

Choose **همهٔ حساب‌ها** for the combined trade list, win rate, average planned R/R, realized R, P&L and factor analyses. Choose an account for the same information restricted to that account. The comparison table shows all accounts side by side using the current date and factor filters. Combined win rate uses total wins divided by total wins plus losses; it never averages account percentages. Planned R/R and realized R are averages across eligible closed positions, with open/planned counts shown separately.

Select **حساب این پوزیشن** in the trade form to assign or move a position. The account view filter and trade assignment are separate; switching the view preserves the draft. Balance and risk defaults are edited on **حساب‌ها**; the trade editor shows the budget of its assigned account. Changing accounts or account balances preserves an executed position's saved initial risk and financial results. All accounts share the journal's currency and weekend settings; the scenario matrix remains an independent hypothetical calculator.

Full JSON and CSV exports include every account's positions, regardless of the current view. JSON also preserves account settings, descriptions, archived status and images. CSV includes account ID and name; older CSV rows without account columns use the active account selected in the form, or an available active account. Version 7 and earlier journals migrate automatically, with an exact pre-account storage copy retained before migration. A portable pre-change backup is also saved as `journal-before-accounts.json`.


## Minimal interface and separate pages

- **نمای کلی** opens by default with four main metrics, expandable secondary metrics, recent trades, and open/planned shortcuts.
- **معاملات** contains search/status/date filters and 25 trades per page. Advanced filters start collapsed. Active chips can be removed individually. Mobile uses compact cards; each position still shows its own maximum R.
- **معاملهٔ جدید** opens the dedicated grouped editor and resumes an existing draft. Select the position's account in the page header; its risk context appears beside the live calculator. Essential prices and quantity stay visible; optional setup, behavior, excursion and image sections expand as needed. Successful saves open Position Detail.
- **تحلیل عملکرد** contains measured reports in separate tabs. **شبیه‌ساز R/R** is the independent hypothetical matrix.
- **تنظیمات → عمومی → مدیریت ستاپ‌ها و فاکتورها / مدیریت تأییدیه‌ها** manages searchable catalogs and descriptions. The position editor selects existing options; it does not create or edit catalog definitions. Returning to the editor retains the draft.
- **تنظیمات → عمومی** edits currency/weekend preferences. Click **ذخیرهٔ تنظیمات** to commit them.
- **تنظیمات → داده و پشتیبان** contains full JSON backup/restore, CSV import/export, and demo controls. Exports include all positions regardless of report filters or pagination.

The account reporting selector appears on Dashboard, Trades, Analytics and Charts. It does not change the account assigned to an unsaved position. The same filters apply across reporting pages; account comparison ignores account scope while retaining the other filters.

Internal page changes retain the trade draft, ordered selections and attachment processing. Replacing or clearing it asks for confirmation. Reload/external navigation warns about unsaved trade changes; drafts are session-only. Browser Back/Forward and legacy journal links continue to work.

## Win-rate charts

Open **نمودارها** in the sidebar for charts by entry hour, weekday, day of month and trade factors. All charts use the current account and report filters, including every matching position regardless of the Trades page number. The previous detailed reports remain under **تحلیل عملکرد**; **جدول تحلیل کامل** opens their comparison table directly.

Charts are stacked in one column at every screen width. Factor charts initially show eight frequent options; use **نمایش همهٔ … گزینه** to reveal the remainder and **نمایش ۸ گزینهٔ اول** to collapse them. **جزئیات کامل** always includes every group. Factor lists follow the main page scroll, and selecting a bar shows its statistics without a large reserved blank area.

The month chart defaults to **شمسی (جلالی)**. Choose **میلادی** for Gregorian days. These charts group the entry date/time you recorded; they do not convert timezones. Unknown entry times appear separately from midnight.

Select a bar or factor row to see its sample, wins/losses/breakevens, planned R/R, realized R and net result. Expand **جزئیات کامل** below any card for all statistics, including MFE, MAE and individual Max R observations. Use **فاکتور بیشتر** to chart markets, direction, mistakes, quality, confidence, Max R, symbols or accounts.

Win rate is wins divided by wins plus losses. Breakevens, open and planned positions are excluded from that denominator. **—** means no decided outcomes; **۰٪** means losses with no wins. Multi-choice factor groups can overlap, so their counts need not sum to the journal total. Read percentages alongside sample sizes; a result filter can itself produce 0% or 100%.

Dropdowns, searchable multiple-choice inputs and accordion sections now use bundled Headless UI controls; icons use Heroicons. Arrow keys navigate choices, Enter selects and Escape closes. They work offline and retain drafts and ordered choices when moving between pages.

## Record partial profits at different R levels

In a trade's editor, expand **خروج پله‌ای و ذخیرهٔ سود** and click **افزودن خروج پله‌ای**. Enter the exit's R level and the percentage of the **original position** you closed. For example, 25% at 1R plus 25% at 2R leaves 50% open. Optional date/time records when each exit occurred. Zero R is allowed; negative R records a partial loss.

The editor shows each partial amount, equivalent exit price, realized cash to date and remaining quantity. R uses the position's saved initial risk and excludes fees. Enter the total position fees recorded to date in the existing fee field; they are deducted once from the combined result.

Keep the position **باز** while some quantity remains. When closing it, **قیمت خروج حجم باقی‌مانده** applies only to that remaining quantity. If the partial rows total 100%, choose **بسته** and record the closure date/time; an additional final price is unnecessary. You cannot save more than 100% or executed exits on a planned trade.

Partial results appear in Position Detail, trade rows/cards and recent trades. Open positions' partial cash is labeled separately; closed-position analytics and win rate include the position after it is fully closed. Full JSON backups and CSV exports retain the partial rows. Copies start as planned positions with no executed partial exits. The R/R simulator is unchanged.

## Record monthly, weekly, daily and 4H directions

In a position's editor, expand **جهت تایم‌فریم‌ها**. Record a direction separately for **ماهانه**, **هفتگی**, **روزانه** and **۴ ساعته**. Each can be **صعودی** (bullish), **نزولی** (bearish), **خنثی** (neutral) or **ثبت نشده** (not recorded).

These fields describe your view of the market at each timeframe. They are independent of the trade's **خرید / فروش** direction and the existing timeframe selections. For example, a long position can have bearish weekly context and bullish daily context. Leaving a field as **ثبت نشده** records no assumption. Earlier positions start with all four unrecorded. Saving displays them together in Position Detail, and editing restores the saved values.

## Create simple, detailed, directional or combined confirmations

Open **تنظیمات → عمومی → مدیریت تأییدیه‌ها**. This takes you to the confirmations category in **ستاپ‌ها و فاکتورها**. When adding a confirmation, enter its name, optional catalog description and **نوع تأییدیه**:

| Choice | What appears when selected on a position |
|---|---|
| **ساده** | A normal selected confirmation |
| **با جزئیات** | An optional note for this confirmation on this position |
| **جهت‌دار** | A bullish, bearish, neutral or not-recorded direction |
| **دارای جهت و جزئیات** | Both a direction and an optional note on the same position |

To create the example `MWC`, enter `MWC` as the name, optionally describe it as `Medium Wave Cycle`, choose **جهت‌دار**, and add it. Then open a position, select MWC under its confirmations, and choose the direction for that position. Its direction can differ from the trade direction and from each timeframe's direction.

Choose **دارای جهت و جزئیات** if you want to record both for MWC or any other confirmation. Selecting it on the position displays the note and direction inputs together. Simple, note-only and direction-only choices remain available.

Notes and directions open in a collapsible popup beneath the confirmation option, overlaying the other cards without moving them. Use the chevron to close or reopen it; Escape and clicking outside also close it. Visible field headings are removed while accessible labels remain. Collapsing, deselecting/reselecting and internal page navigation preserve your entered values. Only one confirmation popup opens at a time.

Choose **با جزئیات** when you want a different written observation on each position. Its note accepts up to 1,000 characters and supports Persian and Latin text. The catalog description explains the confirmation for every position; the position note records your observation for this particular trade. Both appear on Position Detail.

Change an existing definition's type in Settings and click **ذخیره**. Previously saved positions retain the type and values they recorded. When the editor identifies a difference from the current definition, **اعمال نوع تنظیم‌شده بر این پوزیشن** applies that saved type to this draft while retaining earlier note and direction values. This action changes the position only; catalog definitions are managed in Settings. Save the position to commit that choice.

Navigating to Accounts or Catalogs and returning keeps the current draft, selected confirmation order, notes and directions. Deselecting and reselecting a confirmation within that draft restores its entered value. Archiving a definition keeps its history. Reloads still warn about unsaved trade changes; draft inputs are not portable backups until the position is saved.

The existing confirmation filters and charts continue to match selected confirmation names. These new context fields do not change trade calculations, partial exits or simulator results. Full JSON backups include definitions, types, position values and images. CSV exports preserve the saved timeframe and confirmation values in their own JSON-encoded columns. The current format is **version 11**; older journals migrate without changing existing observations, retaining an exact browser-local copy before migration.
