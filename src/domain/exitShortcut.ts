import {
  calculateInitialPlan,
  fillSchema,
  getInstrument,
  type EconomicInput,
} from "./economics";
import { decimal, positive } from "./numbers";
import type { InitialPlan } from "./types";

/** Derive a price from account-currency R, with the actual realization FX explicit. */
export function previewRExit(
  input: EconomicInput,
  r: unknown,
  quantity: unknown,
  fxRate: unknown,
) {
  if (input.status === "planned")
    throw new Error("خروج اجراشده برای معاملهٔ برنامه‌ریزی‌شده مجاز نیست.");
  if (Array.isArray(input.partialExits) && input.partialExits.length)
    throw new Error(
      "این معامله خروج R قدیمی دارد؛ برای حفظ سابقه، دو روش خروج را هم‌زمان استفاده نکن.",
    );
  const instrument = getInstrument(input);
  const total = positive(input.quantity),
    amount = positive(quantity),
    fx = positive(fxRate);
  const existing = (Array.isArray(input.fills) ? input.fills : []).map(
    (value) => fillSchema.parse(value),
  );
  const exited = existing.reduce(
    (sum, fill) => sum.plus(fill.quantity),
    decimal(0),
  );
  if (exited.plus(amount).gt(total))
    throw new Error("حجم خروج از حجم باقی‌مانده بیشتر است.");
  const initial = input.initialPlan as InitialPlan | undefined;
  const risk = positive(initial?.risk ?? calculateInitialPlan(input).risk);
  const price = decimal(input.entry).plus(
    risk
      .times(decimal(r))
      .div(total)
      .div(instrument.multiplier)
      .div(fx)
      .times(input.direction === "short" ? -1 : 1),
  );
  if (!instrument.signedPrices && !price.gt(0))
    throw new Error("قیمت خروج باید مثبت باشد.");
  if (
    decimal(instrument.priceIncrement).gt(0) &&
    !price.mod(instrument.priceIncrement).isZero()
  )
    throw new Error(
      "قیمت مشتق‌شده با گام قرارداد سازگار نیست؛ قیمت اجرا را مستقیم وارد کن.",
    );
  if (
    decimal(instrument.quantityIncrement).gt(0) &&
    !amount.mod(instrument.quantityIncrement).isZero()
  )
    throw new Error("حجم خروج با گام قرارداد سازگار نیست.");
  return {
    price: price.toString(),
    quantity: amount.toString(),
    fxRate: fx.toString(),
    r: decimal(r).toString(),
  };
}
