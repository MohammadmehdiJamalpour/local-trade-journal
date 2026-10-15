import {
  filterReport,
  recordedReport,
  type ReportFact,
  type ReportQuery,
} from "./engine";
import type { TradeRecord } from "../domain/types";

export interface WorkerRequest {
  id: number;
  revision: number;
  query: ReportQuery;
  trades: TradeRecord[];
  facts?: ReportFact[];
}
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, revision, query, trades, facts } = event.data;
  try {
    self.postMessage({
      id,
      revision,
      result: facts
        ? recordedReport(facts, query)
        : filterReport(trades, query),
    });
  } catch (error) {
    self.postMessage({
      id,
      revision,
      error: error instanceof Error ? error.message : "محاسبه کامل نشد.",
    });
  }
};
