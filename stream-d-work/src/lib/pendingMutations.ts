// Optimistic-update reconciliation helper.
//
// Once writes actually persist (blocked today — tasks RLS write policy is
// USING (FALSE) for everyone, see taskStore.tsx), local optimistic updates
// will race the Realtime echo of our OWN write. Without reconciliation that
// echo either flickers the UI back through a stale intermediate value or
// reads as a second, unrelated change landing right after the user's action.
//
// This module tracks "mutations we just made ourselves" per entity for a
// short window, so the store can recognize an incoming Realtime row as an
// echo of its own write and skip re-applying/flickering it, rather than
// treating it as new information from someone else.
//
// NOT WIRED IN YET: since every live write currently fails against the
// closed RLS policy, there is no successful write for a Realtime event to
// echo — wiring this into the Realtime handler today would be dead code.
// Re-added per instruction for continuity; wire it in once writes actually
// succeed.

export interface PendingMutation {
  /** The patch this client applied optimistically, keyed by column/field name. */
  patch: Record<string, unknown>;
  registeredAt: number;
}

const DEFAULT_TTL_MS = 8000;

export class PendingMutationTracker {
  private pending = new Map<string, PendingMutation>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Call right after firing an optimistic local update, before the write resolves. */
  register(entityId: string, patch: Record<string, unknown>, now: number = Date.now()): void {
    this.pending.set(entityId, { patch, registeredAt: now });
  }

  /** Call once the request that owns this mutation resolves (success or failure). */
  clear(entityId: string): void {
    this.pending.delete(entityId);
  }

  /**
   * True if `incoming` (a Realtime row for entityId) matches a still-live
   * pending mutation this client made — i.e. it's an echo of our own write,
   * not new information, and the caller can skip re-applying it. A mutation
   * older than the TTL is dropped and treated as "not an echo" so a
   * genuinely new server-side change is never suppressed.
   */
  isEcho(entityId: string, incoming: Record<string, unknown>, now: number = Date.now()): boolean {
    const mutation = this.pending.get(entityId);
    if (!mutation) return false;
    if (now - mutation.registeredAt > this.ttlMs) {
      this.pending.delete(entityId);
      return false;
    }
    return Object.entries(mutation.patch).every(([key, value]) => incoming[key] === value);
  }

  /** Drop any entries older than the TTL. Call periodically, or before a large batch merge. */
  sweep(now: number = Date.now()): void {
    for (const [entityId, mutation] of this.pending) {
      if (now - mutation.registeredAt > this.ttlMs) this.pending.delete(entityId);
    }
  }
}
