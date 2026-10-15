import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireDraftSession,
  type DraftSessionLocks,
  type DraftSessionStorage,
} from "../../src/persistence/draftSession";

const candidate = "existing-editor-draft";
const storageKey = "edge-journal:draft:live";
function memoryStorage(previous: string | null = candidate) {
  const values = new Map<string, string>();
  if (previous) values.set(storageKey, previous);
  const storage: DraftSessionStorage = {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      values.set(key, value);
    }),
  };
  return { storage, values };
}
function locksFor(grants: boolean[]) {
  const held: string[] = [];
  const manager: DraftSessionLocks = {
    request: vi.fn((name, options, callback) => {
      const granted = grants.shift() ?? true;
      expect(options).toEqual({ ifAvailable: true });
      if (granted) held.push(name);
      return Promise.resolve().then(() =>
        callback(granted ? ({ name, mode: "exclusive" } as Lock) : null),
      );
    }),
  };
  return { manager, held };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("draft session ownership", () => {
  it("reclaims an available saved ID for restoration after reload and holds its lock", async () => {
    const { storage, values } = memoryStorage();
    const { manager, held } = locksFor([true]);
    const result = await acquireDraftSession("live", storage, manager);
    expect(result).toEqual({ id: candidate, restoreId: candidate });
    expect(values.get(storageKey)).toBe(candidate);
    expect(held).toEqual([storageKey + ":" + candidate]);
    const lockRequest = vi.mocked(manager.request).mock.results[0].value;
    let released = false;
    void Promise.resolve(lockRequest).then(() => {
      released = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(released).toBe(false);
  });

  it("allocates and claims a fresh ID when a cloned session belongs to another live tab", async () => {
    const { storage, values } = memoryStorage();
    const { manager, held } = locksFor([false, true]);
    const result = await acquireDraftSession("live", storage, manager);
    expect(result.id).not.toBe(candidate);
    expect(result.restoreId).toBeUndefined();
    expect(values.get(storageKey)).toBe(result.id);
    expect(held).toEqual([storageKey + ":" + result.id]);
    expect(manager.request).toHaveBeenCalledTimes(2);
  });

  it("claims a fresh first-load ID without inventing a restoration source", async () => {
    const { storage } = memoryStorage(null);
    const { manager, held } = locksFor([true]);
    const result = await acquireDraftSession("live", storage, manager);
    expect(result).toEqual({ id: expect.any(String) });
    expect(held).toEqual([storageKey + ":" + result.id]);
  });

  it("does not use a fresh ID whose lock is unexpectedly already held", async () => {
    const { storage } = memoryStorage(null);
    const { manager, held } = locksFor([false, true]);
    const result = await acquireDraftSession("live", storage, manager);
    expect(manager.request).toHaveBeenCalledTimes(2);
    expect(held).toEqual([storageKey + ":" + result.id]);
  });

  it("uses a fresh write ID and retains the previous restore ID when Web Locks are unavailable", async () => {
    const { storage, values } = memoryStorage();
    const result = await acquireDraftSession("live", storage, null);
    expect(result.id).not.toBe(candidate);
    expect(result.restoreId).toBe(candidate);
    expect(values.get(storageKey)).toBe(result.id);
  });

  it.each(["throw", "reject"])(
    "preserves the original draft when Web Locks %s",
    async (failure) => {
      const { storage } = memoryStorage();
      const manager: DraftSessionLocks = {
        request: vi.fn(() => {
          if (failure === "throw") throw new Error("Locks unavailable");
          return Promise.reject(new Error("Locks unavailable"));
        }),
      };
      const result = await acquireDraftSession("live", storage, manager);
      expect(result.id).not.toBe(candidate);
      expect(result.restoreId).toBe(candidate);
    },
  );

  it("does not restore a known live tab's draft if claiming the new ID subsequently fails", async () => {
    const { storage } = memoryStorage();
    let calls = 0;
    const request: DraftSessionLocks["request"] = (
      _name,
      _options,
      callback,
    ) =>
      ++calls === 1
        ? callback(null)
        : Promise.reject(new Error("Service failed"));
    const manager: DraftSessionLocks = {
      request: vi.fn(request),
    };
    const result = await acquireDraftSession("live", storage, manager);
    expect(result.id).not.toBe(candidate);
    expect(result.restoreId).toBeUndefined();
  });

  it("continues with an isolated ID when reading and writing session storage fail", async () => {
    const storage: DraftSessionStorage = {
      getItem: vi.fn(() => {
        throw new Error("Storage disabled");
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage disabled");
      }),
    };
    const { manager } = locksFor([true]);
    const result = await acquireDraftSession("live", storage, manager);
    expect(result).toEqual({ id: expect.any(String) });
    expect(storage.setItem).toHaveBeenCalled();
  });

  it("can reclaim a previous ID even when saving the session ID is denied", async () => {
    const { storage } = memoryStorage();
    storage.setItem = () => {
      throw new Error("Storage full");
    };
    const result = await acquireDraftSession(
      "live",
      storage,
      locksFor([true]).manager,
    );
    expect(result).toEqual({ id: candidate, restoreId: candidate });
  });

  it("keeps main and demo session keys independent", async () => {
    const { storage, values } = memoryStorage();
    values.set("edge-journal:draft:demo", "demo-editor");
    const result = await acquireDraftSession(
      "demo",
      storage,
      locksFor([true]).manager,
    );
    expect(result).toEqual({ id: "demo-editor", restoreId: "demo-editor" });
    expect(values.get(storageKey)).toBe(candidate);
  });

  it("uses the browser's storage and lock manager by default", async () => {
    const { storage } = memoryStorage();
    const { manager } = locksFor([true]);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("navigator", { locks: manager });
    expect(await acquireDraftSession("live")).toEqual({
      id: candidate,
      restoreId: candidate,
    });
  });

  it("safely handles missing browser globals", async () => {
    vi.stubGlobal("sessionStorage", undefined);
    vi.stubGlobal("navigator", undefined);
    expect(await acquireDraftSession("live")).toEqual({
      id: expect.any(String),
    });
  });
  it("bounds repeatedly refused fresh lock claims", async () => {
    const { storage } = memoryStorage();
    const result = await acquireDraftSession(
      "live",
      storage,
      locksFor([false, false, false, false]).manager,
    );
    expect(result.id).not.toBe(candidate);
    expect(result.restoreId).toBeUndefined();
  });

  it("safely handles browser property access that throws", async () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      "sessionStorage",
    );
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("Origin denied");
      },
    });
    vi.stubGlobal(
      "navigator",
      Object.defineProperty({}, "locks", {
        get() {
          throw new Error("Origin denied");
        },
      }),
    );
    try {
      expect(await acquireDraftSession("live")).toEqual({
        id: expect.any(String),
      });
    } finally {
      if (original)
        Object.defineProperty(globalThis, "sessionStorage", original);
      else Reflect.deleteProperty(globalThis, "sessionStorage");
    }
  });
});
