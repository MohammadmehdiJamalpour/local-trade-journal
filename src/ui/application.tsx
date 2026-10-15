import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { services } from "../services";
import type { AuditEvent, Fill, LoadResult } from "../domain/types";
import type { EconomicInput } from "../domain/economics";

let advancedValue: Record<string, unknown> = {};
const advancedListeners = new Set<() => void>();
export const advanced = {
  editingId: "",
  get: () => advancedValue,
  subscribe(listener: () => void) {
    advancedListeners.add(listener);
    return () => {
      advancedListeners.delete(listener);
    };
  },
  set(value: Record<string, unknown>) {
    advanced.editingId = String(value.id || "");
    advancedValue = { ...value };
    advancedListeners.forEach((listener) => listener());
  },
  update(value: Record<string, unknown>) {
    advancedValue = { ...advancedValue, ...value };
    advancedListeners.forEach((listener) => listener());
    globalThis.dispatchEvent(new CustomEvent("edge-domain-change"));
  },
};
export interface PreviewRow {
  id: string;
  symbol: string;
  accountId: string;
  quantity: unknown;
  netPnl?: unknown;
  accountCurrency?: unknown;
}
interface DialogOptions {
  text: string;
  password: boolean;
  rows?: PreviewRow[];
  resolve: (result: string | boolean | null) => void;
}
let dialogRoot: ReturnType<typeof createRoot> | undefined;
let dialogHost: HTMLDialogElement;
let dialogQueue = Promise.resolve();
let lastAction: HTMLElement | null = null;
function DialogContent({ options }: { options: DialogOptions }) {
  const [password, setPassword] = useState(""),
    [page, setPage] = useState(0);
  const finish = (result: string | boolean | null) => {
    setPassword("");
    dialogHost.close();
    options.resolve(result);
  };
  return (
    <form
      method="dialog"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "input:not([disabled]),button:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]",
          ),
        );
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === controls.at(-1)
        ) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        finish(options.password ? password : true);
      }}
    >
      <h2 id="edge-dialog-title">
        {options.password ? "پشتیبان رمزدار" : "تأیید تغییر"}
      </h2>
      <p id="edge-dialog-description">{options.text}</p>
      {options.password && (
        <label htmlFor="edge-backup-password">
          رمز پشتیبان
          <input
            autoFocus
            id="edge-backup-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      )}
      {options.rows && (
        <section aria-label="پیش‌نمایش رکوردهای معتبر">
          <p>
            {options.rows.length} ردیف معتبر · صفحهٔ {page + 1} از{" "}
            {Math.max(1, Math.ceil(options.rows.length / 20))}
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="ردیف‌های قابل ورود"
          >
            <table>
              <caption className="sr-only">همین رکوردها وارد می‌شوند</caption>
              <thead>
                <tr>
                  {["شناسه / نماد", "حساب", "حجم", "خالص / ارز"].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {options.rows.slice(page * 20, (page + 1) * 20).map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      {row.symbol}
                      <small>{row.id}</small>
                    </th>
                    <td>{row.accountId}</td>
                    <td>
                      <bdi>{String(row.quantity)}</bdi>
                    </td>
                    <td>
                      <bdi>
                        {String(row.netPnl ?? "—")}{" "}
                        {String(row.accountCurrency || "")}
                      </bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <button
              type="button"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              صفحهٔ قبل
            </button>
            <button
              type="button"
              disabled={(page + 1) * 20 >= options.rows.length}
              onClick={() => setPage(page + 1)}
            >
              صفحهٔ بعد
            </button>
            <button
              type="button"
              onClick={() =>
                services.download(
                  "journal-import-preview.json",
                  JSON.stringify(options.rows, null, 2),
                )
              }
            >
              دریافت پیش‌نمایش کامل
            </button>
          </div>
        </section>
      )}
      <div className="button-row">
        <button className="button" type="submit">
          تأیید
        </button>
        <button
          className="button ghost"
          type="button"
          autoFocus={!options.password}
          onClick={() => finish(options.password ? null : false)}
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
async function showDialog(
  text: string,
  password: boolean,
  rows?: PreviewRow[],
): Promise<string | boolean | null> {
  const active = document.activeElement;
  const opener =
    active instanceof HTMLElement &&
    active.matches("button,a,input,select,textarea")
      ? active
      : lastAction;
  let finishPrevious: () => void;
  const previous = dialogQueue;
  dialogQueue = new Promise<void>((resolve) => {
    finishPrevious = resolve;
  });
  await previous;
  try {
    if (!dialogRoot) {
      dialogHost = document.createElement("dialog");
      dialogHost.className = "edge-dialog";
      dialogHost.setAttribute("aria-labelledby", "edge-dialog-title");
      dialogHost.setAttribute("aria-describedby", "edge-dialog-description");
      document.body.append(dialogHost);
      dialogRoot = createRoot(dialogHost);
    }
    return await new Promise((resolve) => {
      const onCancel = (event: Event) => {
        event.preventDefault();
        dialogHost.close();
        complete(password ? null : false);
      };
      dialogHost.addEventListener("cancel", onCancel, { once: true });
      const complete = (result: string | boolean | null) => {
        dialogHost.removeEventListener("cancel", onCancel);
        resolve(result);
      };
      dialogRoot!.render(
        <DialogContent
          key={crypto.randomUUID()}
          options={{ text, password, rows, resolve: complete }}
        />,
      );
      dialogHost.showModal();
    });
  } finally {
    dialogRoot?.render(null);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    finishPrevious!();
  }
}
export const dialogs = {
  confirm: async (text: string) => Boolean(await showDialog(text, false)),
  preview: async (text: string, rows: PreviewRow[]) =>
    Boolean(await showDialog(text, false, rows)),
  password: async (text: string) => {
    const value = await showDialog(text, true);
    return typeof value === "string" ? value : null;
  },
};
function AdvancedEditor() {
  const values = useSyncExternalStore(advanced.subscribe, advanced.get),
    instrument = (values.instrument || {}) as Record<string, unknown>;
  const [history, setHistory] = useState<AuditEvent[]>([]);
  const id = advanced.editingId;
  useEffect(() => {
    let active = true;
    setHistory([]);
    if (id)
      void services.repository
        .auditTrail(services.mode)
        .then((events) => {
          if (active)
            setHistory(events.filter((event) => event.tradeId === id));
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);
  const fills = (values.fills || []) as Fill[];
  const [shortcutR, setShortcutR] = useState("1");
  const [shortcutQuantity, setShortcutQuantity] = useState("");
  const [shortcutError, setShortcutError] = useState("");
  const updateInstrument = (field: string, value: unknown) =>
    advanced.update({
      instrument: {
        id:
          "instrument-" +
          (document.querySelector<HTMLInputElement>("#symbol")?.value ||
            "TRADE"),
        symbol:
          document.querySelector<HTMLInputElement>("#symbol")?.value || "TRADE",
        model: "linear",
        quoteCurrency: String(values.accountCurrency || "USD"),
        quantityUnit: "units",
        multiplier: "1",
        priceIncrement: "0",
        quantityIncrement: "0",
        signedPrices: false,
        ...instrument,
        [field]: value,
      },
    });
  const input = (
    id: string,
    label: string,
    value: unknown,
    change: (value: string) => void,
    type = "text",
  ) => (
    <label className="field" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        inputMode={
          type === "text" && !/currency/i.test(id) ? "decimal" : undefined
        }
        value={String(value ?? "")}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  );
  return (
    <details className="economic-editor">
      <summary>بازار، ارز، خروج با قیمت و اصلاحات</summary>
      <p className="hint">
        مدل خطی؛ مشخصات قرارداد و نرخ تبدیل را دستی وارد کن. اختیار معامله و
        قرارداد معکوس پشتیبانی نمی‌شوند.
      </p>
      <div className="form-grid">
        {input(
          "instrument-currency",
          "ارز قیمت / سود قرارداد",
          instrument.quoteCurrency || values.accountCurrency || "USD",
          (value) => updateInstrument("quoteCurrency", value.toUpperCase()),
        )}
        <label className="field" htmlFor="instrument-unit">
          واحد حجم
          <select
            id="instrument-unit"
            value={String(instrument.quantityUnit || "units")}
            onChange={(event) =>
              updateInstrument("quantityUnit", event.target.value)
            }
          >
            <option value="units">واحد / سهم</option>
            <option value="lots">لات فارکس</option>
            <option value="contracts">قرارداد آتی</option>
          </select>
        </label>
        {input(
          "instrument-multiplier",
          "ضریب هر واحد حجم (لات استاندارد: ۱۰۰۰۰۰)",
          instrument.multiplier || "1",
          (value) => updateInstrument("multiplier", value),
        )}
        {input(
          "instrument-price-step",
          "گام قیمت (صفر: بدون محدودیت)",
          instrument.priceIncrement || "0",
          (value) => updateInstrument("priceIncrement", value),
        )}
        {input(
          "instrument-quantity-step",
          "گام حجم (صفر: بدون محدودیت)",
          instrument.quantityIncrement || "0",
          (value) => updateInstrument("quantityIncrement", value),
        )}
        <label>
          <input
            id="instrument-signed"
            type="checkbox"
            checked={Boolean(instrument.signedPrices)}
            onChange={(event) =>
              updateInstrument("signedPrices", event.target.checked)
            }
          />{" "}
          اجازهٔ قیمت صفر یا منفی برای این قرارداد
        </label>
        {input(
          "entry-fx-rate",
          "نرخ تبدیل ارز قیمت به ارز حساب در ریسک اولیه",
          values.entryFxRate || "1",
          (value) => advanced.update({ entryFxRate: value }),
        )}
        {input(
          "exit-fx-rate",
          "نرخ تبدیل سود خروج نهایی به ارز حساب",
          values.exitFxRate || "1",
          (value) => advanced.update({ exitFxRate: value }),
        )}
        {input(
          "fee-fx-rate",
          "نرخ تبدیل کارمزد به ارز حساب",
          values.feeFxRate || "1",
          (value) => advanced.update({ feeFxRate: value }),
        )}
        {input(
          "fees-currency",
          "ارز کارمزد",
          values.feesCurrency || values.accountCurrency || "USD",
          (value) => advanced.update({ feesCurrency: value.toUpperCase() }),
        )}
      </div>
      {Boolean(values.initialPlan) && (
        <p className="hint">
          ریسک اولیه حفظ می‌شود. تغییر حد ضرر فعلی، مبنای R را تغییر نمی‌دهد.
          {(values.initialPlan as { source?: string }).source ===
            "legacy-assumption" &&
            " سابقهٔ قدیمی: ضریب و تبدیل اولیه نیاز به بررسی دارند."}
        </p>
      )}
      <h3>خروج‌های اجراشده با قیمت و حجم</h3>
      <fieldset className="fill-editor">
        <legend>میان‌بر خروج در R</legend>
        <p className="hint">
          قیمت از ریسک اولیه و نرخ تبدیل خروج بالا محاسبه می‌شود. پس از تأیید
          پیش‌نمایش، زمان، کارمزد و قیمت واقعی اجرا را در خروج جدید بررسی کن.
        </p>
        <div className="form-grid">
          {input("shortcut-r", "R خروج", shortcutR, setShortcutR)}
          {input(
            "shortcut-quantity",
            "حجم این خروج (واحد حجم قرارداد)",
            shortcutQuantity,
            setShortcutQuantity,
          )}
          <button
            type="button"
            id="preview-r-exit"
            className="button ghost"
            disabled={fills.length >= 50}
            onClick={async () => {
              try {
                setShortcutError("");
                const preview = services.previewRExit(
                  shortcutR,
                  shortcutQuantity,
                );
                if (
                  await dialogs.confirm(
                    `قیمت خروج: ${preview.price} · حجم: ${preview.quantity} · تبدیل سود: ${preview.fxRate} · R: ${preview.r}. این خروج به پیش‌نویس اضافه شود؟`,
                  )
                ) {
                  const now = new Date();
                  const date = [
                    now.getFullYear(),
                    String(now.getMonth() + 1).padStart(2, "0"),
                    String(now.getDate()).padStart(2, "0"),
                  ].join("-");
                  const time = [
                    String(now.getHours()).padStart(2, "0"),
                    String(now.getMinutes()).padStart(2, "0"),
                  ].join(":");
                  advanced.update({
                    fills: [
                      ...fills,
                      {
                        id: crypto.randomUUID(),
                        price: preview.price,
                        quantity: preview.quantity,
                        fxRate: preview.fxRate,
                        fees: "0",
                        feeCurrency: String(
                          values.feesCurrency ||
                            values.accountCurrency ||
                            "USD",
                        ),
                        feeFxRate: String(values.feeFxRate || "1"),
                        date,
                        time,
                      },
                    ],
                  });
                }
              } catch (error) {
                setShortcutError(
                  error instanceof Error
                    ? error.message
                    : "پیش‌نمایش خروج ممکن نشد.",
                );
              }
            }}
          >
            پیش‌نمایش قیمت خروج در R
          </button>
        </div>
        {shortcutError && (
          <p role="alert" className="field-error">
            {shortcutError}
          </p>
        )}
      </fieldset>
      <p className="hint">
        این خروج‌ها جایگزین خروج‌های R قدیمی می‌شوند؛ از ثبت یک خروج در هر دو
        بخش خودداری کن.
      </p>
      {fills.map((fill, index) => (
        <fieldset key={fill.id} className="fill-editor">
          <legend>خروج {index + 1}</legend>
          <div className="form-grid">
            {(
              [
                "price",
                "quantity",
                "fxRate",
                "fees",
                "feeCurrency",
                "feeFxRate",
                "date",
                "time",
              ] as const
            ).map((field) =>
              input(
                "fill-" + fill.id + "-" + field,
                {
                  price: "قیمت اجرا",
                  quantity: "حجم اجرا",
                  fxRate: "تبدیل سود به ارز حساب",
                  fees: "کارمزد این خروج",
                  feeCurrency: "ارز کارمزد این خروج",
                  feeFxRate: "تبدیل کارمزد",
                  date: "تاریخ اجرا (میلادی)",
                  time: "ساعت اجرا",
                }[field],
                fill[field] ?? values.accountCurrency ?? "USD",
                (value) =>
                  advanced.update({
                    fills: fills.map((row, rowIndex) =>
                      rowIndex === index
                        ? {
                            ...row,
                            [field]:
                              field === "feeCurrency"
                                ? value.toUpperCase()
                                : value,
                          }
                        : row,
                    ),
                  }),
                field === "date" ? "date" : field === "time" ? "time" : "text",
              ),
            )}
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                advanced.update({
                  fills: fills.filter((row) => row.id !== fill.id),
                })
              }
            >
              حذف این خروج
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button ghost"
        disabled={fills.length >= 50}
        onClick={() =>
          advanced.update({
            fills: [
              ...fills,
              {
                id: crypto.randomUUID(),
                price: "",
                quantity: "",
                fxRate: "1",
                fees: "0",
                feeFxRate: "1",
                date: "",
                time: "",
              },
            ],
          })
        }
      >
        افزودن خروج با قیمت
      </button>
      {advanced.editingId && (
        <fieldset className="correction-editor">
          <legend>اصلاح اجرای اصلی با ثبت سابقه</legend>
          <p className="hint">
            برای اصلاح ورود، حجم، جهت یا مشخصات اجرا، دلیل و پلن اولیهٔ درست را
            ثبت کن. پیامد اصلاح پیش از ذخیره نمایش داده می‌شود.
          </p>
          <label className="field" htmlFor="correction-reason">
            دلیل اصلاح
            <textarea
              id="correction-reason"
              maxLength={1000}
              value={String(values.correctionReason || "")}
              onChange={(event) =>
                advanced.update({ correctionReason: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            {input(
              "correction-stop",
              "حد ضرر اولیهٔ صحیح",
              values.correctionInitialStop ||
                (values.initialPlan as { stop?: string } | undefined)?.stop ||
                "",
              (value) => advanced.update({ correctionInitialStop: value }),
            )}
            {input(
              "correction-target",
              "هدف اولیهٔ صحیح",
              values.correctionInitialTarget ||
                (values.initialPlan as { target?: string } | undefined)
                  ?.target ||
                "",
              (value) => advanced.update({ correctionInitialTarget: value }),
            )}
          </div>
        </fieldset>
      )}
      {history.length > 0 && (
        <details>
          <summary>سابقهٔ اصلاحات ({history.length})</summary>
          <ol>
            {history.map((event) => (
              <li key={event.id}>
                <bdi>{event.createdAt}</bdi> · {event.reason}
                <pre dir="ltr">
                  {JSON.stringify(
                    {
                      before: {
                        entry: event.before.entry,
                        quantity: event.before.quantity,
                        netPnl: event.before.netPnl,
                        initialRisk: event.before.initialPlan.risk,
                      },
                      after: {
                        entry: event.after.entry,
                        quantity: event.after.quantity,
                        netPnl: event.after.netPnl,
                        initialRisk: event.after.initialPlan.risk,
                      },
                    },
                    null,
                    2,
                  )}
                </pre>
              </li>
            ))}
          </ol>
        </details>
      )}
    </details>
  );
}
let recoveryRoot: ReturnType<typeof createRoot>;
function Recovery({ result }: { result: LoadResult }) {
  const [accepted, setAccepted] = useState(false),
    [error, setError] = useState("");
  if (result.status === "ready" || result.status === "empty") return null;
  return (
    <section
      className={
        "recovery-panel" + (result.migrationRequired ? " migration-panel" : "")
      }
      aria-labelledby="recovery-title"
      role="region"
    >
      <h2 id="recovery-title">
        {result.migrationRequired
          ? "ارتقای ذخیره‌سازی ژورنال"
          : "ژورنال فقط خواندنی است"}
      </h2>
      <p>
        منبع اصلی تغییر نکرده است. ابتدا{" "}
        {result.migrationRequired ? "پشتیبان و پیش‌نمایش ارتقا" : "بازیابی"} را
        بررسی کن.
      </p>
      <p>
        {result.data.trades.length} معاملهٔ قابل خواندن ·{" "}
        {result.rejected.length} مورد نیازمند بررسی
      </p>
      <ul>
        {result.rejected.slice(0, 10).map((row, index) => (
          <li key={index}>
            ردیف {row.index + 1}: {row.reasons.join("؛ ")}
          </li>
        ))}
      </ul>
      <p>{result.error}</p>
      {result.source && (
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            services.download("journal-raw-recovery.json", result.source!.raw)
          }
        >
          دریافت دقیق منبع اصلی
        </button>
      )}
      {result.migrationRequired && (
        <button
          className="button"
          type="button"
          onClick={() => {
            void services
              .exportLegacyBackup()
              .catch((error) => setError(String(error.message)));
          }}
        >
          پشتیبان کامل پیش از ارتقا
        </button>
      )}
      {result.status === "recovery-required" && result.source && (
        <>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />{" "}
            {result.migrationRequired
              ? "پشتیبان را بررسی کرده‌ام و ارتقای این موارد سالم را می‌پذیرم؛ منبع اصلی نگه داشته می‌شود."
              : "بازیابی موارد سالم و کنار گذاشتن موارد نامعتبر یا تصاویر ناموجود را می‌پذیرم؛ منبع اصلی نگه داشته می‌شود."}
          </label>
          <button
            type="button"
            className="button"
            disabled={!accepted}
            onClick={() => {
              void services
                .recover()
                .catch((error) => setError(String(error.message)));
            }}
          >
            {result.migrationRequired
              ? "ارتقا و ادامه"
              : "ساخت ژورنال بازیابی‌شده"}
          </button>
        </>
      )}
      <p role="alert">{error}</p>
      <a className="button ghost" href="#settings/data">
        ورود یک پشتیبان سالم
      </a>
    </section>
  );
}
export function updateRecoveryPanel(result: LoadResult) {
  recoveryRoot?.render(<Recovery result={result} />);
}
export function updateStorageStatus(message: string, error = false) {
  const node = document.querySelector<HTMLElement>("#durable-save-status");
  if (node) {
    node.textContent = message;
    node.classList.toggle("is-error", error);
  }
}
function DataTools() {
  const [message, setMessage] = useState(""),
    [snapshots, setSnapshots] = useState<
      {
        id: string;
        pinned: boolean;
        createdAt: string;
        raw?: string;
        data?: unknown;
        rejected?: { index: number; raw: unknown; reasons: string[] }[];
      }[]
    >([]);
  const run = (action: () => Promise<unknown>) => {
    void action().catch((error) => setMessage(String(error.message)));
  };
  return (
    <section className="backup-tools">
      <h3>حفاظت و مدیریت ذخیره‌سازی</h3>
      <p>
        حداکثر JSON: ۲۵۶ مگابایت؛ CSV: ۶۴ مگابایت؛ ۱۰۰٬۰۰۰ رکورد. اطلاعات مرورگر
        رمزگذاری نشده‌اند. رمز پشتیبان قابل بازیابی نیست.
      </p>
      <div className="button-row">
        <button
          className="button"
          type="button"
          onClick={() => run(() => services.exportJSON(true))}
        >
          پشتیبان رمزدار
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            run(async () => {
              const granted = await services.requestPersistence();
              setMessage(
                granted
                  ? "درخواست نگهداری پایدار پذیرفته شد؛ پشتیبان بیرونی همچنان لازم است."
                  : "مرورگر نگهداری پایدار را نپذیرفت؛ پشتیبان بیرونی بگیر.",
              );
            })
          }
        >
          درخواست نگهداری پایدار
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            run(async () => {
              const info = await services.storageInfo();
              setSnapshots(info.snapshots);
              setMessage(
                "فضای مصرف‌شدهٔ مبدأ مرورگر: " +
                  Math.round((info.estimate?.usage || 0) / 1024) +
                  " KiB",
              );
            })
          }
        >
          بررسی فضا و نسخه‌های بازیابی
        </button>
      </div>
      <button
        className="button ghost"
        type="button"
        onClick={() =>
          run(async () => {
            if (
              await dialogs.confirm(
                "نسخه‌های قدیمی localStorage پس از نگه‌داشتن دقیق منبع در نسخه‌های بازیابی حذف شوند؟ ابتدا پشتیبان کامل را در دستگاه بررسی کن. تصاویر پایگاه قدیمی نگه داشته می‌شوند.",
              )
            ) {
              await services.removeLegacySources();
              setMessage(
                "کلیدهای ژورنال قدیمی پاک شد؛ منبع دقیق در نسخه‌های بازیابی باقی است.",
              );
            }
          })
        }
      >
        پاک‌سازی نسخه‌های قدیمی مرورگر
      </button>
      <ul>
        {snapshots.map((snapshot) => (
          <li key={snapshot.id}>
            {snapshot.pinned
              ? "منبع مهاجرت نگه‌داری‌شده"
              : "نسخهٔ پیش از تغییر"}{" "}
            · {snapshot.createdAt} ·{" "}
            {snapshot.raw
              ? Math.round((snapshot.raw.length * 2) / 1024) + " KiB"
              : ""}
            {snapshot.raw && (
              <button
                className="button ghost small"
                type="button"
                onClick={() =>
                  services.download(
                    "journal-recovery-source.json",
                    snapshot.raw!,
                  )
                }
              >
                دریافت
              </button>
            )}
            {Boolean(snapshot.rejected?.length) && (
              <button
                className="button ghost small"
                type="button"
                onClick={() =>
                  services.download(
                    "journal-quarantine.json",
                    JSON.stringify(snapshot.rejected, null, 2),
                  )
                }
              >
                دریافت موارد ردشده و علت‌ها ({snapshot.rejected!.length})
              </button>
            )}
            {Boolean(snapshot.data) && (
              <button
                className="button ghost small"
                type="button"
                onClick={() =>
                  run(async () => {
                    if (
                      await dialogs.confirm(
                        "ژورنال فعلی با این نسخهٔ بازیابی جایگزین شود؟ نسخهٔ فعلی نیز نگه داشته می‌شود.",
                      )
                    )
                      await services.restoreSnapshot(snapshot.id);
                  })
                }
              >
                بازگردانی این نسخه
              </button>
            )}
            <button
              className="button ghost small"
              type="button"
              onClick={() =>
                run(async () => {
                  if (
                    await dialogs.confirm(
                      "این نسخهٔ بازیابی برای همیشه حذف شود؟ پیش از حذف، فایل پشتیبان را در دستگاه بررسی کن.",
                    )
                  ) {
                    await services.repository.deleteSnapshot(snapshot.id);
                    setSnapshots(
                      snapshots.filter((item) => item.id !== snapshot.id),
                    );
                  }
                })
              }
            >
              حذف نسخهٔ بازیابی
            </button>
          </li>
        ))}
      </ul>
      <p role="status">{message}</p>
    </section>
  );
}
export function mountApplicationPanels() {
  document.addEventListener(
    "click",
    (event) => {
      if (dialogHost?.open || !(event.target instanceof Element)) return;
      lastAction =
        event.target.closest<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled])",
        ) || lastAction;
    },
    true,
  );
  const recovery = document.createElement("div");
  recovery.id = "recovery-host";
  document.querySelector("main")?.prepend(recovery);
  recoveryRoot = createRoot(recovery);
  const status = document.createElement("p");
  status.id = "durable-save-status";
  status.className = "durable-save-status";
  status.setAttribute("role", "status");
  document.querySelector("main")?.prepend(status);
  const topbar = document.querySelector<HTMLElement>(".app-topbar");
  const measure = () => {
    document.documentElement.style.setProperty(
      "--journal-topbar-height",
      (topbar?.getBoundingClientRect().height || 76) + "px",
    );
    document.documentElement.style.setProperty(
      "--journal-status-height",
      status.getBoundingClientRect().height + "px",
    );
  };
  measure();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(measure);
    observer.observe(status);
    if (topbar) observer.observe(topbar);
  }
  const editor = document.createElement("div");
  document.querySelector("#trade-form")?.append(editor);
  createRoot(editor).render(<AdvancedEditor />);
  const backup = document.createElement("div");
  document.querySelector("#settings-data")?.append(backup);
  createRoot(backup).render(<DataTools />);
  const accountField = document.createElement("div");
  accountField.className = "field";
  const label = document.createElement("label");
  label.htmlFor = "account-editor-currency";
  label.textContent = "ارز این حساب";
  const input = document.createElement("input");
  input.id = "account-editor-currency";
  input.maxLength = 8;
  input.value = "USD";
  input.className = "ltr";
  accountField.append(label, input);
  document
    .querySelector("#account-editor-balance")
    ?.closest(".field")
    ?.after(accountField);
}
export type AdvancedInput = EconomicInput;
