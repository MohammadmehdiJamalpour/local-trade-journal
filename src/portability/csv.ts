/** RFC 4180-style records, including quoted newlines, BOM, CRLF and Unicode. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    endedQuote = false;
  const pushRow = () => {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
    field = "";
    endedQuote = false;
  };
  text = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        endedQuote = true;
      } else field += char;
    } else if (char === '"' && !field && !endedQuote) quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
      endedQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      pushRow();
    } else if (endedQuote || char === '"')
      throw new Error("ساختار نقل‌قول CSV نامعتبر است.");
    else field += char;
  }
  if (quoted) throw new Error("یک فیلد نقل‌قول‌شده در CSV بسته نشده است.");
  pushRow();
  return rows;
}
// Controls before a formula marker can bypass spreadsheet protections.
// eslint-disable-next-line no-control-regex
const formulaStart = /^[\s\u0000-\u001f]*[=+\-@]/;
const needsProtection = (text: string) =>
  text.startsWith("'") || formulaStart.test(text) || /^[\t\r\n]/.test(text);
export function csvEscape(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && needsProtection(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csvUnescape(value: unknown): string {
  const text = String(value ?? "");
  return text.startsWith("'") && needsProtection(text.slice(1))
    ? text.slice(1)
    : text;
}
