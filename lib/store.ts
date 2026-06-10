// in-memory for now — would move this to Firestore (collection: saved_links)
// before shipping, using the url as the doc id so we get idempotency for free
import type { SavedLink } from "./types";

// stash on globalThis so the map survives Next.js dev-mode module reloads —
// otherwise route handlers that get recompiled on demand each get their own
// fresh (empty) store
const globalForStore = globalThis as unknown as {
  linkStore?: Map<string, SavedLink>;
};

const store = globalForStore.linkStore ?? new Map<string, SavedLink>();
globalForStore.linkStore = store;

export function createLink(link: SavedLink): void {
  store.set(link.id, link);
}

export function updateLink(id: string, patch: Partial<SavedLink>): void {
  const existing = store.get(id);
  if (!existing) return;
  store.set(id, { ...existing, ...patch });
}

export function findByUrl(url: string): SavedLink | undefined {
  return Array.from(store.values()).find((link) => link.url === url);
}

export function getAll(): SavedLink[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getById(id: string): SavedLink | undefined {
  return store.get(id);
}
