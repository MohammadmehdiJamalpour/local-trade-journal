import Decimal from "decimal.js";

Decimal.set({
  precision: 34,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -30,
  toExpPos: 30,
});
export { Decimal };
export function englishDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬،,\s\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/٫/g, ".")
    .replace(/[−–—]/g, "-");
}
export function decimal(value: unknown): Decimal {
  if (typeof value !== "number" && typeof value !== "string")
    throw new Error("عدد معتبر وارد کن.");
  const text = englishDigits(value);
  if (
    text.length > 128 ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)
  )
    throw new Error("عدد معتبر وارد کن.");
  const result = new Decimal(text);
  if (
    !result.isFinite() ||
    (!result.isZero() && (result.e > 100 || result.e < -100))
  )
    throw new Error("عدد خارج از محدودهٔ امن است.");
  return result;
}
export function canonical(value: unknown): string {
  return decimal(value).toString();
}
export function positive(value: unknown): Decimal {
  const result = decimal(value);
  if (!result.gt(0)) throw new Error("مقدار باید مثبت باشد.");
  return result;
}
export function nonNegative(value: unknown): Decimal {
  const result =
    value === "" || value == null ? new Decimal(0) : decimal(value);
  if (result.lt(0)) throw new Error("مقدار نمی‌تواند منفی باشد.");
  return result;
}
