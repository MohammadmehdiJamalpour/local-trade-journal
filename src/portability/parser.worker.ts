import { parseCSV } from "./csv";
self.onmessage = (
  event: MessageEvent<{ text: string; format: "json" | "csv" }>,
) => {
  try {
    self.postMessage({
      value:
        event.data.format === "csv"
          ? parseCSV(event.data.text)
          : JSON.parse(event.data.text),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "خواندن فایل کامل نشد.",
    });
  }
};
