import { describe, expect, it } from "vitest";
import {
  accountRelationshipIssues,
  inspectAudit,
} from "../../src/domain/boundaries";
import { canonicalTrade } from "../../src/domain/economics";
import { rawTrade } from "../fixtures/journal";

const modern = (overrides: Record<string, unknown> = {}) => ({
  version: 13,
  accounts: [{ id: "account-main", currency: "USD" }],
  trades: [rawTrade({ accountCurrency: "USD" })],
  ...overrides,
});
const audit = (overrides: Record<string, unknown> = {}) => ({
  id: "live:audit-1",
  mode: "live",
  tradeId: "trade-1",
  reason: "Corrected the execution price",
  createdAt: "2026-10-15T10:00:00.000Z",
  before: canonicalTrade(rawTrade({ accountCurrency: "USD" }), "USD"),
  after: canonicalTrade(
    rawTrade({ exit: "121", accountCurrency: "USD" }),
    "USD",
  ),
  ...overrides,
});

describe("modern account relationships", () => {
  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    "leaves version %i account recovery to legacy adapters",
    (version) => {
      expect(
        accountRelationshipIssues({
          version,
          accounts: null,
          trades: [rawTrade({ accountId: "missing", accountCurrency: "EUR" })],
        }),
      ).toEqual([]);
    },
  );

  it("accepts explicitly declared matching currencies across accounts", () => {
    expect(
      accountRelationshipIssues(
        modern({
          accounts: [
            { id: "account-main", currency: "USD" },
            { id: "eur-account", currency: "EUR" },
          ],
          trades: [
            rawTrade({ accountCurrency: "USD" }),
            rawTrade({
              id: "eur-trade",
              accountId: "eur-account",
              accountCurrency: "EUR",
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("preserves the original row and index when its account is undeclared", () => {
    const rejectedTrade = rawTrade({
      accountId: "missing",
      accountCurrency: "EUR",
    });
    const result = accountRelationshipIssues(
      modern({ trades: [rawTrade({ accountCurrency: "USD" }), rejectedTrade] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ index: 1 });
    expect(result[0].raw).toBe(rejectedTrade);
    expect(result[0].reasons[0]).toContain("تعریف نشده");
  });

  it.each([undefined, null, "EUR", "usd", "bad currency", 123])(
    "rejects a missing, invalid or conflicting explicit currency %j",
    (accountCurrency) => {
      expect(
        accountRelationshipIssues(
          modern({ trades: [rawTrade({ accountCurrency })] }),
        ),
      ).toHaveLength(1);
    },
  );

  it.each([undefined, null, {}, [{ id: "unrelated", currency: "USD" }]])(
    "does not invent associations when the account list is %j",
    (accounts) => {
      expect(accountRelationshipIssues(modern({ accounts }))).toHaveLength(1);
    },
  );

  it("leaves nonobject trade validation to other boundary validators", () => {
    expect(
      accountRelationshipIssues(
        modern({ trades: [null, undefined, [], 1, "trade"] }),
      ),
    ).toEqual([]);
  });

  it("rejects a declared account without a matching declared currency", () => {
    expect(
      accountRelationshipIssues(modern({ accounts: [{ id: "account-main" }] })),
    ).toHaveLength(1);
  });
});

describe("audit boundary inspection", () => {
  it("accepts a valid correction, trims its reason and canonicalizes snapshot results", () => {
    const event = audit({ reason: "  Corrected the execution price  " });
    event.after.netPnl = "999999";
    const result = inspectAudit([event], "live");
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].reason).toBe("Corrected the execution price");
    expect(result.accepted[0].before.netPnl).toBe("190");
    expect(result.accepted[0].after.netPnl).toBe("200");
    expect(result.accepted[0].before.accountCurrency).toBe("USD");
  });

  it("validates demo corrections against the selected mode", () => {
    expect(
      inspectAudit([audit({ mode: "demo" })], "demo").accepted,
    ).toHaveLength(1);
    expect(
      inspectAudit([audit({ mode: "demo" })], "live").rejected,
    ).toHaveLength(1);
  });

  it("keeps before and after currency labels explicit when an audited correction changes accounts", () => {
    const event = audit({
      after: canonicalTrade(
        rawTrade({ accountId: "eur-account", accountCurrency: "EUR" }),
        "EUR",
      ),
    });
    const result = inspectAudit([event], "live");
    expect(result.rejected).toEqual([]);
    expect(result.accepted[0].before.accountCurrency).toBe("USD");
    expect(result.accepted[0].after.accountCurrency).toBe("EUR");
  });

  it.each([
    { id: "" },
    { id: "x".repeat(101) },
    { tradeId: "different" },
    { mode: "other" },
    { mode: undefined },
    { reason: "   " },
    { reason: "x".repeat(1001) },
    { createdAt: "yesterday" },
    { createdAt: "2026-02-30T10:00:00Z" },
    { before: null },
    { after: [] },
  ])("quarantines a malformed or inconsistent event %j", (override) => {
    const event = audit(override);
    const result = inspectAudit([event], "live");
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].raw).toBe(event);
    expect(result.rejected[0].index).toBe(0);
    expect(result.rejected[0].reasons.length).toBeGreaterThan(0);
  });

  it.each(["before", "after"] as const)(
    "rejects economically invalid, unlabelled or misidentified %s snapshots",
    (field) => {
      const valid = audit();
      for (const snapshot of [
        { ...valid[field], id: "wrong-trade" },
        { ...valid[field], accountCurrency: undefined },
        { ...valid[field], accountCurrency: "invalid currency" },
        { ...valid[field], quantity: "-1" },
        { ...valid[field], exit: "-1" },
        {
          ...valid[field],
          instrument: { ...valid[field].instrument, model: "inverse" },
        },
      ]) {
        const event = { ...valid, [field]: snapshot };
        const result = inspectAudit([event], "live");
        expect(result.accepted).toEqual([]);
        expect(result.rejected[0].raw).toBe(event);
      }
    },
  );

  it("quarantines duplicate event IDs without dropping unrelated valid events", () => {
    const event = audit();
    const duplicate = audit({
      reason: "Another correction with the same identity",
    });
    const another = audit({ id: "live:audit-2" });
    const result = inspectAudit([event, duplicate, another], "live");
    expect(result.accepted.map((item) => item.id)).toEqual([
      "live:audit-1",
      "live:audit-2",
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({ index: 1 });
    expect(result.rejected[0].raw).toBe(duplicate);
  });

  it("does not reinterpret an invalid earlier audit identity as a later valid event", () => {
    const invalid = audit({ before: null });
    const result = inspectAudit([invalid, audit()], "live");
    expect(result.accepted).toEqual([]);
    expect(result.rejected.map((item) => item.index)).toEqual([0, 1]);
    expect(result.rejected[1].reasons[0]).toContain("تکراری");
  });

  it("accepts ISO timestamps with an explicit offset and preserves it", () => {
    const createdAt = "2026-10-15T13:30:00+03:30";
    const result = inspectAudit([audit({ createdAt })], "live");
    expect(result.rejected).toEqual([]);
    expect(result.accepted[0].createdAt).toBe(createdAt);
  });

  it("returns an empty inspection for an empty audit history", () => {
    expect(inspectAudit([], "live")).toEqual({ accepted: [], rejected: [] });
  });
});
