export type JournalMode = "live" | "demo";
export type Direction = "long" | "short";
export type DecimalValue = string;
export interface Instrument {
  id: string;
  symbol: string;
  model: "linear";
  quoteCurrency: string;
  quantityUnit: "units" | "lots" | "contracts";
  multiplier: DecimalValue;
  priceIncrement: DecimalValue;
  quantityIncrement: DecimalValue;
  signedPrices: boolean;
}
export interface InitialPlan {
  entry: DecimalValue;
  stop: DecimalValue | null;
  target: DecimalValue | null;
  quantity: DecimalValue;
  risk: DecimalValue;
  reward: DecimalValue;
  rr: DecimalValue;
  fxRate: DecimalValue;
  instrument: Instrument;
  source: "recorded" | "legacy-assumption";
}
export interface Fill {
  id: string;
  price: DecimalValue;
  quantity: DecimalValue;
  fxRate: DecimalValue;
  fees: DecimalValue;
  feeFxRate: DecimalValue;
  feeCurrency?: string;
  date: string;
  time: string;
}
export interface TradeRecord extends Record<string, unknown> {
  id: string;
  accountId: string;
  status: "planned" | "open" | "closed";
  direction: Direction;
  symbol: string;
  entry: DecimalValue;
  stop: DecimalValue;
  target: DecimalValue;
  quantity: DecimalValue;
  exit: DecimalValue | null;
  fees: DecimalValue;
  plannedRisk: DecimalValue;
  plannedReward: DecimalValue;
  plannedRR: DecimalValue;
  instrument: Instrument;
  initialPlan: InitialPlan;
  entryFxRate: DecimalValue;
  exitFxRate: DecimalValue;
  feeFxRate: DecimalValue;
  feesCurrency: string;
  fills: Fill[];
  images: ImageReference[];
}
export interface ImageReference {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
}
export interface ImageAsset extends ImageReference {
  blob: Blob;
  hash: string;
}
export interface Account extends Record<string, unknown> {
  id: string;
  name: string;
  currency: string;
  accountBalance: DecimalValue;
  riskMode: "percent" | "fixed";
  riskPercent: DecimalValue;
  fixedRisk: DecimalValue;
  archived: boolean;
}
export interface JournalData {
  version: number;
  settings: Record<string, unknown>;
  accounts: Account[];
  options: Record<string, unknown[]>;
  trades: TradeRecord[];
}
export interface RejectedRecord {
  index: number;
  raw: unknown;
  reasons: string[];
}
export type LoadStatus =
  | "empty"
  | "ready"
  | "recovery-required"
  | "unsupported-version"
  | "storage-unavailable";
export interface LoadResult {
  status: LoadStatus;
  data: JournalData;
  revision: number;
  rejected: RejectedRecord[];
  source?: { key: string; raw: string };
  error?: string;
  migrationRequired?: boolean;
}
export type CommitFailure =
  | "revision-conflict"
  | "quota"
  | "validation"
  | "storage-unavailable"
  | "recovery-required";
export type CommitResult =
  | { ok: true; revision: number; data: JournalData }
  | { ok: false; reason: CommitFailure; message: string };
export interface AuditEvent {
  id: string;
  mode: JournalMode;
  tradeId: string;
  reason: string;
  before: TradeRecord;
  after: TradeRecord;
  createdAt: string;
}
