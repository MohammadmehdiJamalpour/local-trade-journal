import type { JournalMode } from "../domain/types";

export interface DraftSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface DraftSessionLocks {
  request(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: Lock | null) => Promise<void>,
  ): Promise<unknown>;
}
export interface DraftSession {
  id: string;
  restoreId?: string;
}

function browserStorage(): DraftSessionStorage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}
function browserLocks(): DraftSessionLocks | undefined {
  try {
    return globalThis.navigator?.locks;
  } catch {
    return undefined;
  }
}

/** A granted callback stays pending until the document unloads and releases its Web Lock. */
function claim(locks: DraftSessionLocks, name: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const request = locks.request(
        name,
        { ifAvailable: true },
        async (lock) => {
          resolve(lock !== null);
          if (lock) await new Promise<void>(() => undefined);
        },
      );
      void Promise.resolve(request).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/** Keep cloned tab session IDs from writing to another live editor's draft. */
export async function acquireDraftSession(
  mode: JournalMode,
  storage?: DraftSessionStorage | null,
  locks?: DraftSessionLocks | null,
): Promise<DraftSession> {
  const session = storage === undefined ? browserStorage() : storage;
  const manager = locks === undefined ? browserLocks() : locks;
  const key = "edge-journal:draft:" + mode;
  let previous: string | undefined;
  try {
    previous = session?.getItem(key) || undefined;
  } catch {
    /* A private/blocked origin can still use an isolated in-memory editor ID. */
  }
  const assigned = (id: string, restoreId?: string): DraftSession => {
    try {
      session?.setItem(key, id);
    } catch {
      /* Failure to retain the session ID cannot justify overwriting an existing draft. */
    }
    return restoreId === undefined ? { id } : { id, restoreId };
  };
  let ownedElsewhere = false;
  if (manager) {
    try {
      if (previous) {
        if (await claim(manager, key + ":" + previous))
          return assigned(previous, previous);
        ownedElsewhere = true;
      }
      // Fresh UUID collisions are exceedingly unlikely; a refused claim still must not share an ID.
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = crypto.randomUUID();
        if (await claim(manager, key + ":" + id)) return assigned(id);
      }
    } catch {
      /* Unsupported or refused Web Locks fall back to an ID unique to this load. */
    }
  }
  return assigned(crypto.randomUUID(), ownedElsewhere ? undefined : previous);
}
