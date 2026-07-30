import { FIELD_TOKEN_KEY } from "../lib/api";
import { emitSyncState, listOutbox, pendingCount, removeOutbox, updateOutbox } from "./storage";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";
let running = false;

export async function synchronizeOutbox(): Promise<void> {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    const token = localStorage.getItem(FIELD_TOKEN_KEY) ?? sessionStorage.getItem(FIELD_TOKEN_KEY);
    for (const item of await listOutbox()) {
      try {
        const response = await fetch(`${API_URL}${item.path}`, {
          method: item.method,
          headers: {
            "content-type": "application/json",
            "idempotency-key": item.id,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: item.body,
        });
        if (response.ok) {
          await removeOutbox(item.id);
          continue;
        }
        const terminal = response.status >= 400 && response.status < 500 && response.status !== 409 && response.status !== 429;
        const message = (await response.json().catch(() => null) as { error?: { message?: string } } | null)?.error?.message;
        if (terminal) await removeOutbox(item.id);
        else await updateOutbox({ ...item, attempts: item.attempts + 1, lastError: message ?? `HTTP ${response.status}` });
        if (!terminal) break;
      } catch (reason) {
        await updateOutbox({ ...item, attempts: item.attempts + 1, lastError: reason instanceof Error ? reason.message : "Bağlantı hatası" });
        break;
      }
    }
  } finally {
    running = false;
    await emitSyncState();
  }
}

export { pendingCount };
