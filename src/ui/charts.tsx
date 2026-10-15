import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";

interface Group {
  key: string;
  label: string;
  count: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null;
  avgR: number | null;
  net: number | null;
  avgPlannedRR: number | null;
  avgMaxUnrealizedProfit: number | null;
  avgMaxUnrealizedLoss: number | null;
  avgMaxTouchedR: number | null;
  maxTouchedR: number | null;
  netByCurrency?: Record<string, string>;
}
interface ChartData {
  summary: Group;
  totalCount: number;
  excludedCount: number;
  outcomeFilter: string | null;
  hours: { groups: Group[] } | Group[];
  weekdays: { groups: Group[] } | Group[];
  monthDays: Record<string, { groups: Group[] } | Group[]>;
  factors: Record<
    string,
    { label: string; groups: Group[]; overlapping: boolean }
  >;
  format: {
    number: (value: number | null, digits?: number) => string;
    money: (value: number | null, currency?: string) => string;
    r: (value: number | null) => string;
    rr: (value: number | null) => string;
  };
}
function groups(value: { groups: Group[] } | Group[] | undefined): Group[] {
  return Array.isArray(value) ? value : value?.groups || [];
}
function GroupChart({
  title,
  rows,
  data,
}: {
  title: string;
  rows: Group[];
  data: ChartData;
}) {
  return (
    <section className="chart-source-card">
      <h2>{title}</h2>
      <div className="chart-bars" role="list">
        {rows.map((row) => (
          <div key={row.key} role="listitem" className="chart-bar-row">
            <span>{row.label}</span>
            <div
              className="chart-bar-track"
              role="img"
              aria-label={
                row.label +
                "، نرخ برد " +
                data.format.number(row.winRate, 1) +
                " درصد، " +
                row.count +
                " معامله"
              }
            >
              <span style={{ width: (row.winRate || 0) + "%" }} />
            </div>
            <bdi>
              {data.format.number(row.winRate, 1)}٪ ·{" "}
              {data.format.number(row.count)}
            </bdi>
          </div>
        ))}
      </div>
      <details>
        <summary>جدول کامل و قابل خواندن</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={"آمار " + title}
        >
          <table>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {[
                  "گروه",
                  "تعداد",
                  "برد",
                  "باخت",
                  "سربه‌سر",
                  "نرخ برد",
                  "R/R پلن",
                  "R واقعی",
                  "P&L خالص",
                  "MFE",
                  "MAE",
                  "میانگین R لمس‌شده",
                  "بیشترین R لمس‌شده",
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  {[
                    row.count,
                    row.wins,
                    row.losses,
                    row.breakevens,
                    row.winRate,
                    row.avgPlannedRR,
                    row.avgR,
                  ].map((value, index) => (
                    <td key={index}>{data.format.number(value)}</td>
                  ))}
                  <td>
                    {row.netByCurrency
                      ? Object.entries(row.netByCurrency)
                          .map(([currency, value]) =>
                            data.format.money(Number(value), currency),
                          )
                          .join(" · ")
                      : data.format.money(row.net)}
                  </td>
                  <td>{data.format.money(row.avgMaxUnrealizedProfit)}</td>
                  <td>{data.format.money(row.avgMaxUnrealizedLoss)}</td>
                  <td>{data.format.r(row.avgMaxTouchedR)}</td>
                  <td>{data.format.r(row.maxTouchedR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
function Charts({ data }: { data: ChartData }) {
  const [factor, setFactor] = useState("strategy"),
    [month, setMonth] = useState(Object.keys(data.monthDays)[0] || "");
  const selected = data.factors[factor] || Object.values(data.factors)[0];
  return (
    <>
      <p role="status">
        {data.format.number(data.summary.count)} معاملهٔ بسته ·{" "}
        {data.format.number(data.excludedCount)} باز یا برنامه‌ریزی‌شده خارج از
        نرخ برد
      </p>
      {data.outcomeFilter && (
        <p className="factor-warning">
          فیلتر نتیجه فعال است؛ نرخ برد اثر انتخاب برد/باخت را نشان می‌دهد.
        </p>
      )}
      <GroupChart
        title="نرخ برد در ساعت ورود"
        rows={groups(data.hours)}
        data={data}
      />
      <GroupChart
        title="نرخ برد در روز هفته"
        rows={groups(data.weekdays)}
        data={data}
      />
      <label className="field" htmlFor="chart-month">
        بازهٔ روزهای ماه
        <select
          id="chart-month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          {Object.keys(data.monthDays).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>
      <GroupChart
        title="روزهای ماه"
        rows={groups(data.monthDays[month])}
        data={data}
      />
      <label className="field" htmlFor="chart-factor">
        فاکتور مقایسه
        <select
          id="chart-factor"
          value={factor}
          onChange={(event) => setFactor(event.target.value)}
        >
          {Object.entries(data.factors).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <p>
            {selected.overlapping
              ? "هر معامله در همهٔ گزینه‌های انتخاب‌شده دیده می‌شود؛ گروه‌ها هم‌پوشانی دارند."
              : ""}
          </p>
          <GroupChart
            title={selected.label}
            rows={selected.groups}
            data={data}
          />
        </>
      )}
    </>
  );
}
const roots = new WeakMap<HTMLElement, Root>();
export function installCharts() {
  globalThis.EdgeUI.renderCharts = (host, data) => {
    let root = roots.get(host);
    if (!root) {
      root = createRoot(host);
      roots.set(host, root);
    }
    root.render(<Charts data={data as ChartData} />);
  };
}
