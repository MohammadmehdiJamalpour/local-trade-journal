import { z } from "zod";
import { canonical, decimal, Decimal, nonNegative, positive } from "./numbers";
import type { Fill, InitialPlan, Instrument, TradeRecord } from "./types";

const numeric = z.union([z.string(), z.number()]).transform(canonical);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "تاریخ نامعتبر است.");
const tradeBoundary = z
  .object({
    id: z.string().min(1).max(100),
    accountId: z.string().min(1).max(100),
    status: z.enum(["planned", "open", "closed"]),
    direction: z.enum(["long", "short"]),
    symbol: z.string().min(1).max(24),
    openDate: isoDate,
    entry: numeric,
    stop: numeric,
    target: numeric,
    quantity: numeric.refine((value) => decimal(value).gt(0)),
    fees: numeric.refine((value) => decimal(value).gte(0)),
    images: z
      .array(
        z
          .object({
            id: z.string().regex(/^img-[A-Za-z0-9_-]{1,96}$/),
            name: z.string().max(180),
            type: z.enum([
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/gif",
            ]),
            size: z
              .number()
              .int()
              .min(1)
              .max(2 * 1024 * 1024),
            width: z.number().int().min(1).max(8192),
            height: z.number().int().min(1).max(8192),
          })
          .refine((image) => image.width * image.height <= 40000000),
      )
      .max(6)
      .default([]),
  })
  .passthrough();
export const instrumentSchema = z.object({
  id: z.string().min(1).max(100),
  symbol: z.string().max(24),
  model: z.literal("linear"),
  quoteCurrency: z.string().regex(/^[A-Z0-9]{1,8}$/),
  quantityUnit: z.enum(["units", "lots", "contracts"]),
  multiplier: numeric.refine((v) => decimal(v).gt(0)),
  priceIncrement: numeric.refine((v) => decimal(v).gte(0)),
  quantityIncrement: numeric.refine((v) => decimal(v).gte(0)),
  signedPrices: z.boolean(),
});
export const fillSchema = z.object({
  id: z.string().min(1).max(100),
  price: numeric,
  quantity: numeric.refine((v) => decimal(v).gt(0)),
  fxRate: numeric.refine((v) => decimal(v).gt(0)),
  fees: numeric.refine((v) => decimal(v).gte(0)),
  feeFxRate: numeric.refine((v) => decimal(v).gt(0)),
  date: z.string().max(16),
  time: z.string().max(8),
  feeCurrency: z
    .string()
    .regex(/^[A-Z0-9]{1,8}$/)
    .optional(),
});
export function legacyInstrument(symbol: string, currency = "USD"): Instrument {
  return {
    id: "legacy-" + symbol,
    symbol,
    model: "linear",
    quoteCurrency: currency,
    quantityUnit: "units",
    multiplier: "1",
    priceIncrement: "0",
    quantityIncrement: "0",
    signedPrices: false,
  };
}
export interface EconomicInput extends Record<string, unknown> {
  direction?: unknown;
  entry?: unknown;
  stop?: unknown;
  target?: unknown;
  quantity?: unknown;
  instrument?: unknown;
  initialPlan?: unknown;
  plannedRisk?: unknown;
  plannedReward?: unknown;
  plannedRR?: unknown;
  entryFxRate?: unknown;
  exitFxRate?: unknown;
  feeFxRate?: unknown;
  fills?: unknown;
}
export function getInstrument(
  input: EconomicInput,
  currency = "USD",
): Instrument {
  return instrumentSchema.parse(
    input.instrument ??
      legacyInstrument(String(input.symbol || "TRADE"), currency),
  );
}
export function calculateInitialPlan(
  input: EconomicInput,
  currency = "USD",
): InitialPlan {
  const instrument = getInstrument(input, currency);
  const entry = decimal(input.entry),
    stop = decimal(input.stop),
    target = decimal(input.target),
    quantity = positive(input.quantity);
  if (!instrument.signedPrices && [entry, stop, target].some((n) => !n.gt(0)))
    throw new Error("قیمت‌ها باید مثبت باشند.");
  const long = input.direction !== "short";
  if (
    !(long
      ? stop.lt(entry) && target.gt(entry)
      : stop.gt(entry) && target.lt(entry))
  )
    throw new Error("حد ضرر و هدف اولیه با جهت معامله سازگار نیستند.");
  const fx = positive(input.entryFxRate ?? 1),
    multiplier = positive(instrument.multiplier);
  const risk = entry
    .minus(stop)
    .abs()
    .times(quantity)
    .times(multiplier)
    .times(fx);
  const reward = target
    .minus(entry)
    .abs()
    .times(quantity)
    .times(multiplier)
    .times(fx);
  return {
    entry: entry.toString(),
    stop: stop.toString(),
    target: target.toString(),
    quantity: quantity.toString(),
    risk: risk.toString(),
    reward: reward.toString(),
    rr: reward.div(risk).toString(),
    fxRate: fx.toString(),
    instrument,
    source: "recorded",
  };
}
export function normalizeEconomics(
  input: EconomicInput,
  currency = "USD",
): Partial<TradeRecord> {
  const instrument = getInstrument(input, currency);
  const saved = input.initialPlan as InitialPlan | undefined;
  let initialPlan: InitialPlan;
  if (input.status === "planned")
    initialPlan = calculateInitialPlan(input, currency);
  else if (saved) {
    z.enum(["recorded", "legacy-assumption"]).parse(saved.source);
    initialPlan = {
      ...saved,
      instrument: instrumentSchema.parse(saved.instrument),
      entry: canonical(saved.entry),
      quantity: positive(saved.quantity).toString(),
      risk: positive(saved.risk).toString(),
      reward: positive(saved.reward).toString(),
      rr: positive(saved.rr).toString(),
      fxRate: positive(saved.fxRate).toString(),
      stop: saved.stop == null ? null : canonical(saved.stop),
      target: saved.target == null ? null : canonical(saved.target),
    };
    if (initialPlan.source === "recorded") {
      const calculated = calculateInitialPlan({
        ...initialPlan,
        direction: input.direction,
        entryFxRate: initialPlan.fxRate,
      });
      if (
        ["risk", "reward", "rr"].some(
          (field) =>
            calculated[field as "risk" | "reward" | "rr"] !==
            initialPlan[field as "risk" | "reward" | "rr"],
        )
      )
        throw new Error(
          "پلن اولیهٔ ثبت‌شده با ریسک، پاداش یا نسبت آن سازگار نیست.",
        );
    }
  } else if (input.plannedRisk != null && input.plannedRisk !== "") {
    initialPlan = {
      entry: canonical(input.entry),
      quantity: positive(input.quantity).toString(),
      stop: null,
      target: null,
      risk: positive(input.plannedRisk).toString(),
      reward: positive(input.plannedReward ?? input.plannedRisk).toString(),
      rr: positive(input.plannedRR ?? 1).toString(),
      fxRate: positive(input.entryFxRate ?? 1).toString(),
      instrument,
      source: "legacy-assumption",
    };
  } else {
    initialPlan = calculateInitialPlan(input, currency);
    if (input.legacyAssumptions === true)
      initialPlan = {
        ...initialPlan,
        source: "legacy-assumption",
        stop: null,
        target: null,
      };
  }
  const fills = z
    .array(fillSchema)
    .max(50)
    .parse(input.fills ?? [])
    .map((fill) => ({
      ...fill,
      feeCurrency: fill.feeCurrency || String(input.feesCurrency || currency),
    }));
  const partialExits = normalizeLegacyExits(input);
  if (
    fills.length &&
    Array.isArray(input.partialExits) &&
    input.partialExits.length
  )
    throw new Error("خروج با قیمت و خروج R را هم‌زمان ثبت نکن.");
  const total = fills.length
    ? fills.reduce((sum, fill) => sum.plus(fill.quantity), new Decimal(0))
    : partialExits
        .reduce((sum, row) => sum.plus(row.percent), new Decimal(0))
        .times(positive(input.quantity))
        .div(100);
  if (total.gt(positive(input.quantity)))
    throw new Error("مجموع حجم خروج بیشتر از حجم اولیه است.");
  const ids = new Set(fills.map((fill) => fill.id));
  if (ids.size !== fills.length) throw new Error("شناسهٔ خروج تکراری است.");
  if (input.status === "planned" && fills.length)
    throw new Error("خروج واقعی برای معاملهٔ برنامه‌ریزی‌شده مجاز نیست.");
  if (input.status === "open" && total.eq(positive(input.quantity)))
    throw new Error("همهٔ حجم خارج شده است؛ وضعیت را بسته انتخاب کن.");
  if (input.status === "closed") {
    isoDate.parse(input.closeDate);
    if (String(input.closeDate) < String(input.openDate))
      throw new Error("خروج نمی‌تواند پیش از ورود باشد.");
    if (
      input.closeDate === input.openDate &&
      input.closeTime &&
      input.openTime &&
      String(input.closeTime) < String(input.openTime)
    )
      throw new Error("ساعت خروج نمی‌تواند پیش از ورود باشد.");
  }
  if (
    decimal(instrument.quantityIncrement).gt(0) &&
    !positive(input.quantity).mod(instrument.quantityIncrement).isZero()
  )
    throw new Error("حجم با گام قرارداد سازگار نیست.");
  if (
    decimal(instrument.priceIncrement).gt(0) &&
    !decimal(input.entry).mod(instrument.priceIncrement).isZero()
  )
    throw new Error("ورود با گام قیمت قرارداد سازگار نیست.");
  for (const fill of fills) {
    if (!instrument.signedPrices && !decimal(fill.price).gt(0))
      throw new Error("قیمت خروج باید مثبت باشد.");
    if (fill.date && !isoDate.safeParse(fill.date).success)
      throw new Error("تاریخ خروج نامعتبر است.");
    if (
      decimal(instrument.priceIncrement).gt(0) &&
      !decimal(fill.price).mod(instrument.priceIncrement).isZero()
    )
      throw new Error("قیمت خروج با گام قرارداد سازگار نیست.");
    if (
      decimal(instrument.quantityIncrement).gt(0) &&
      !decimal(fill.quantity).mod(instrument.quantityIncrement).isZero()
    )
      throw new Error("حجم خروج با گام قرارداد سازگار نیست.");
    if (fill.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(fill.time))
      throw new Error("ساعت خروج نامعتبر است.");
    const time = fill.date + "T" + (fill.time || "00:00");
    if (
      fill.date &&
      input.openDate &&
      time < String(input.openDate) + "T" + String(input.openTime || "00:00")
    )
      throw new Error("خروج نمی‌تواند پیش از ورود باشد.");
    if (
      input.status === "closed" &&
      fill.date &&
      input.closeDate &&
      time > String(input.closeDate) + "T" + String(input.closeTime || "23:59")
    )
      throw new Error("خروج نمی‌تواند پس از بسته‌شدن باشد.");
  }
  for (const field of [
    "stop",
    "target",
    ...(input.status === "closed" && total.lt(positive(input.quantity))
      ? ["exit"]
      : []),
  ]) {
    const price = decimal(input[field]);
    if (!instrument.signedPrices && !price.gt(0))
      throw new Error("قیمت باید مثبت باشد.");
    if (
      decimal(instrument.priceIncrement).gt(0) &&
      !price.mod(instrument.priceIncrement).isZero()
    )
      throw new Error("قیمت با گام قرارداد سازگار نیست.");
  }
  if (!/^[A-Z0-9]{1,8}$/.test(String(input.feesCurrency || currency)))
    throw new Error("ارز کارمزد معتبر نیست.");
  return {
    instrument,
    initialPlan,
    fills,
    partialExits,
    entryFxRate: positive(input.entryFxRate ?? initialPlan.fxRate).toString(),
    exitFxRate: positive(input.exitFxRate ?? 1).toString(),
    feeFxRate: positive(input.feeFxRate ?? 1).toString(),
    feesCurrency: String(input.feesCurrency || currency),
    plannedRisk: initialPlan.risk,
    plannedReward: initialPlan.reward,
    plannedRR: initialPlan.rr,
  };
}
export function normalizeLegacyExits(input: EconomicInput) {
  const rows = z
    .array(
      z.object({
        id: z.string().min(1).max(100).optional(),
        r: numeric,
        percent: numeric.refine(
          (value) => decimal(value).gt(0) && decimal(value).lte(100),
        ),
        date: z.string().default(""),
        time: z.string().default(""),
      }),
    )
    .max(50)
    .parse(input.partialExits ?? []);
  const ids = new Set<string>();
  let total = new Decimal(0),
    previous = "";
  const result = rows.map((row, index) => {
    const id = row.id || "partial-" + (index + 1);
    if (ids.has(id)) throw new Error("شناسهٔ خروج پله‌ای تکراری است.");
    ids.add(id);
    total = total.plus(row.percent);
    if (row.date) {
      isoDate.parse(row.date);
      const timestamp = row.date + "T" + (row.time || "00:00");
      if (
        row.date < String(input.openDate || "") ||
        (row.date === input.openDate &&
          row.time &&
          input.openTime &&
          row.time < String(input.openTime))
      )
        throw new Error("خروج پله‌ای نمی‌تواند پیش از ورود باشد.");
      if (
        input.status === "closed" &&
        (row.date > String(input.closeDate) ||
          (row.date === input.closeDate &&
            row.time &&
            input.closeTime &&
            row.time > String(input.closeTime)))
      )
        throw new Error("خروج پله‌ای نمی‌تواند پس از بسته‌شدن باشد.");
      if (previous && timestamp < previous)
        throw new Error("ترتیب زمانی خروج‌های پله‌ای را حفظ کن.");
      previous = timestamp;
    }
    if (row.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time))
      throw new Error("ساعت خروج پله‌ای نامعتبر است.");
    return { ...row, id };
  });
  if (total.gt(100))
    throw new Error("مجموع درصد خروج‌های پله‌ای بیشتر از ۱۰۰ است.");
  if (rows.length && input.status === "planned")
    throw new Error("خروج پله‌ای برای معاملهٔ برنامه‌ریزی‌شده مجاز نیست.");
  if (input.status === "open" && total.eq(100))
    throw new Error("همهٔ حجم خارج شده است؛ وضعیت را بسته انتخاب کن.");
  return result;
}
export function calculateFills(input: EconomicInput) {
  const instrument = getInstrument(input);
  const quantity = positive(input.quantity),
    entry = decimal(input.entry),
    multiplier = positive(instrument.multiplier);
  const risk = positive(
    (input.initialPlan as InitialPlan | undefined)?.risk ?? input.plannedRisk,
  );
  const sign = input.direction === "short" ? -1 : 1;
  let fills = z
    .array(fillSchema)
    .max(50)
    .parse(input.fills ?? []);
  if (!fills.length && Array.isArray(input.partialExits)) {
    const fx = positive(input.entryFxRate ?? 1);
    fills = normalizeLegacyExits(input).map((value) => ({
      id: value.id,
      price: entry
        .plus(
          risk
            .div(quantity)
            .div(multiplier)
            .div(fx)
            .times(decimal(value.r))
            .times(sign),
        )
        .toString(),
      quantity: quantity.times(positive(value.percent)).div(100).toString(),
      fxRate: fx.toString(),
      fees: "0",
      feeFxRate: "1",
      date: String(value.date || ""),
      time: String(value.time || ""),
    }));
  }
  let exited = new Decimal(0),
    gross = new Decimal(0),
    fillFees = new Decimal(0);
  const derivedExits = fills.map((fill: Fill) => {
    if (!instrument.signedPrices && !decimal(fill.price).gt(0))
      throw new Error("قیمت خروج پله‌ای باید مثبت باشد.");
    const q = positive(fill.quantity),
      pnl = decimal(fill.price)
        .minus(entry)
        .times(q)
        .times(multiplier)
        .times(sign)
        .times(positive(fill.fxRate));
    exited = exited.plus(q);
    gross = gross.plus(pnl);
    fillFees = fillFees.plus(
      nonNegative(fill.fees).times(positive(fill.feeFxRate)),
    );
    return {
      ...fill,
      percent: q.div(quantity).times(100).toNumber(),
      r: pnl.div(risk).div(q.div(quantity)).toNumber(),
      grossPnl: pnl.toNumber(),
      price: decimal(fill.price).toNumber(),
      quantity: q.toNumber(),
    };
  });
  if (exited.gt(quantity))
    throw new Error("مجموع حجم خروج بیشتر از حجم اولیه است.");
  return {
    exited,
    remaining: quantity.minus(exited),
    gross,
    fillFees,
    risk,
    derivedExits,
  };
}
export function calculateRealized(input: EconomicInput) {
  const instrument = getInstrument(input),
    sign = input.direction === "short" ? -1 : 1;
  const fills = calculateFills(input);
  let gross = fills.gross;
  if (input.status === "closed" && fills.remaining.gt(0)) {
    const exit = decimal(input.exit);
    if (!instrument.signedPrices && !exit.gt(0))
      throw new Error("قیمت خروج باید مثبت باشد.");
    gross = gross.plus(
      exit
        .minus(decimal(input.entry))
        .times(fills.remaining)
        .times(instrument.multiplier)
        .times(sign)
        .times(positive(input.exitFxRate ?? 1)),
    );
  }
  const fees = nonNegative(input.fees)
    .times(positive(input.feeFxRate ?? 1))
    .plus(fills.fillFees);
  const net = gross.minus(fees),
    realizedR = net.div(fills.risk);
  return {
    grossPnl: canonical(gross.toString()),
    netPnl: canonical(net.toString()),
    realizedR: canonical(realizedR.toString()),
    outcome: net.gt(0) ? "win" : net.lt(0) ? "loss" : "breakeven",
  };
}
export const MONEY_FIELDS = [
  "entry",
  "stop",
  "target",
  "quantity",
  "exit",
  "fees",
  "plannedRisk",
  "plannedReward",
  "plannedRR",
  "grossPnl",
  "netPnl",
  "realizedR",
  "maxUnrealizedProfit",
  "maxUnrealizedLoss",
] as const;
export function maximumTouchedR(input: EconomicInput): string | null {
  if (
    !["open", "closed"].includes(String(input.status)) ||
    input.maxUnrealizedProfit == null ||
    input.maxUnrealizedProfit === ""
  )
    return null;
  try {
    return nonNegative(input.maxUnrealizedProfit)
      .div(
        positive(
          (input.initialPlan as InitialPlan | undefined)?.risk ??
            input.plannedRisk,
        ),
      )
      .toString();
  } catch {
    return null;
  }
}
export function canonicalTrade(
  trade: Record<string, unknown>,
  currency: string,
): TradeRecord {
  const validated = tradeBoundary.parse(trade);
  if (
    validated.accountCurrency != null &&
    validated.accountCurrency !== currency
  )
    throw new Error("ارز معامله با ارز حساب سازگار نیست.");
  const result = {
    ...validated,
    ...normalizeEconomics(validated, currency),
    accountCurrency: currency,
  } as TradeRecord;
  if (
    result.status !== "planned" &&
    (result.initialPlan!.entry !== result.entry ||
      result.initialPlan!.quantity !== result.quantity ||
      JSON.stringify(result.initialPlan!.instrument) !==
        JSON.stringify(result.instrument) ||
      result.initialPlan!.fxRate !== result.entryFxRate)
  )
    throw new Error(
      "برای اصلاح اجرای اصلی، دلیل اصلاح و پلن اولیهٔ صحیح را ثبت کن.",
    );
  for (const field of MONEY_FIELDS)
    if (result[field] != null && result[field] !== "")
      result[field] = canonical(result[field]);
  if (result.status === "closed")
    Object.assign(result, calculateRealized(result));
  return result as TradeRecord;
}
