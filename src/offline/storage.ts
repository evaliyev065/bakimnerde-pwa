export interface OutboxItem {
  id: string;
  path: string;
  method: string;
  body: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const DB_NAME = "bakimnerde-pwa-offline";
const DB_VERSION = 1;
const CACHE_STORE = "cache";
const OUTBOX_STORE = "outbox";
const memoryCache = new Map<string, unknown>();
const memoryOutbox = new Map<string, OutboxItem>();

function openDatabase(): Promise<IDBDatabase | null> {
  if (!("indexedDB" in globalThis)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE)) database.createObjectStore(CACHE_STORE);
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) database.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase();
  if (!database) return memoryCache.get(key) as T | undefined;
  const result = await requestResult(database.transaction(CACHE_STORE).objectStore(CACHE_STORE).get(key));
  database.close();
  return result as T | undefined;
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  memoryCache.set(key, value);
  const database = await openDatabase();
  if (!database) return;
  await requestResult(database.transaction(CACHE_STORE, "readwrite").objectStore(CACHE_STORE).put(value, key));
  database.close();
}

export async function enqueue(item: OutboxItem): Promise<void> {
  memoryOutbox.set(item.id, item);
  const database = await openDatabase();
  if (database) {
    await requestResult(database.transaction(OUTBOX_STORE, "readwrite").objectStore(OUTBOX_STORE).put(item));
    database.close();
  }
  await emitSyncState();
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const database = await openDatabase();
  if (!database) return [...memoryOutbox.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const items = await requestResult(database.transaction(OUTBOX_STORE).objectStore(OUTBOX_STORE).getAll()) as OutboxItem[];
  database.close();
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOutbox(id: string): Promise<void> {
  memoryOutbox.delete(id);
  const database = await openDatabase();
  if (database) {
    await requestResult(database.transaction(OUTBOX_STORE, "readwrite").objectStore(OUTBOX_STORE).delete(id));
    database.close();
  }
  await emitSyncState();
}

export async function updateOutbox(item: OutboxItem): Promise<void> {
  await enqueue(item);
}

export async function pendingCount(): Promise<number> {
  return (await listOutbox()).length;
}

export async function emitSyncState(): Promise<void> {
  if (!("dispatchEvent" in globalThis)) return;
  globalThis.dispatchEvent(new CustomEvent("bakimnerde:sync-state", { detail: { pending: await pendingCount() } }));
}
