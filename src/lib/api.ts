import { enqueue, readCache, writeCache } from "../offline/storage";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";
export const FIELD_TOKEN_KEY = "bakimnerde_pwa_token";

interface ApiEnvelope<T> {
  data: T;
  error?: { message?: string };
}

const cacheablePaths = new Set([
  "/auth-me", "/jobs-list", "/job-evidence-list", "/job-field-report-get",
  "/job-messages-list", "/additional-requests-list", "/notifications-list",
]);
const queueablePaths = new Set([
  "/jobs-status-change", "/job-evidence-add", "/job-field-report-save",
  "/job-messages-send", "/additional-requests-create", "/notifications-read",
]);

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(FIELD_TOKEN_KEY) ?? sessionStorage.getItem(FIELD_TOKEN_KEY);
  const method = (options.method ?? "GET").toUpperCase();
  const operationId = queueablePaths.has(path) && method === "POST" ? crypto.randomUUID() : undefined;
  const body = operationId ? withOperationId(options.body, operationId) : options.body;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 2_500);
  const prepared: RequestInit = {
    ...options,
    body,
    signal: options.signal ?? controller.signal,
    headers: {
      "content-type": "application/json",
      "x-api-version": "1",
      ...(operationId ? { "idempotency-key": operationId } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };
  const key = cacheKey(path, body);
  try {
    const response = await fetch(`${API_URL}${path}`, prepared);
    const envelope = await response.json() as ApiEnvelope<T>;
    if (!response.ok) throw new ApiResponseError(response.status, envelope.error?.message ?? "İşlem tamamlanamadı.");
    if (cacheablePaths.has(path)) await writeCache(key, envelope.data);
    if (path === "/auth-field-login") {
      const principal = (envelope.data as { principal?: unknown }).principal;
      if (principal) await writeCache(cacheKey("/auth-me", undefined), principal);
    }
    return envelope.data;
  } catch (reason) {
    if (reason instanceof ApiResponseError) throw reason;
    if (cacheablePaths.has(path)) {
      const cached = await readCache<T>(key);
      if (cached !== undefined) return cached;
    }
    if (operationId && typeof body === "string") {
      await enqueue({ id: operationId, path, method, body, createdAt: new Date().toISOString(), attempts: 0 });
      await applyOptimisticCache(path, body, operationId);
      return { queued: true, offline: true, id: operationId } as T;
    }
    throw new Error("Bakımnerde servisine ulaşılamadı. Çevrimdışı kayıt bulunamadı.");
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function readCachedResponse<T>(path: string, body?: string): Promise<T | undefined> {
  return readCache<T>(cacheKey(path, body));
}

function withOperationId(body: BodyInit | null | undefined, id: string): BodyInit | null | undefined {
  if (typeof body !== "string") return body;
  try { return JSON.stringify({ ...JSON.parse(body) as Record<string, unknown>, clientOperationId: id }); }
  catch { return body; }
}

function cacheKey(path: string, body: BodyInit | null | undefined): string {
  return `${path}:${typeof body === "string" ? body : ""}`;
}

async function applyOptimisticCache(path: string, bodyText: string, operationId: string): Promise<void> {
  const body = JSON.parse(bodyText) as Record<string, unknown>;
  const jobId = String(body.jobId ?? body.id ?? "");
  if (path === "/job-field-report-save") {
    await writeCache(cacheKey("/job-field-report-get", JSON.stringify({ jobId })), {
      id: operationId, ...body, completed: true, updatedAt: new Date().toISOString(),
      measurements: { inputVoltage: body.inputVoltage, outputVoltage: body.outputVoltage },
    });
  }
  if (path === "/job-evidence-add") {
    const key = cacheKey("/job-evidence-list", JSON.stringify({ jobId }));
    const items = await readCache<Array<Record<string, unknown>>>(key) ?? [];
    const mimeType = String(body.mimeType ?? "image/jpeg");
    await writeCache(key, [...items, {
      id: operationId, phase: body.phase, description: body.description,
      url: `data:${mimeType};base64,${String(body.contentBase64 ?? "")}`,
      createdAt: new Date().toISOString(), pendingSync: true,
    }]);
  }
  if (path === "/job-messages-send") {
    const key = cacheKey("/job-messages-list", JSON.stringify({ jobId }));
    const items = await readCache<Array<Record<string, unknown>>>(key) ?? [];
    await writeCache(key, [...items, {
      id: operationId, text: body.text, senderName: "Ben", senderTenantName: "Saha ekibi",
      mine: true, createdAt: new Date().toISOString(), pendingSync: true,
    }]);
  }
  if (path === "/additional-requests-create") {
    const key = cacheKey("/additional-requests-list", JSON.stringify({ jobId }));
    const items = await readCache<Array<Record<string, unknown>>>(key) ?? [];
    await writeCache(key, [{
      id: operationId, type: body.type, description: body.description,
      status: "PENDING_PRICING", partSupplyStatus: "PENDING_PRICING", pendingSync: true,
    }, ...items]);
  }
  if (path === "/jobs-status-change") {
    const key = cacheKey("/jobs-list", undefined);
    const jobs = await readCache<Array<Record<string, unknown>>>(key) ?? [];
    await writeCache(key, jobs.map((job) => job.documentId === jobId ? {
      ...job, status: body.status,
      ...(body.status === "IN_PROGRESS" ? { maintenanceStartedAt: new Date().toISOString() } : {}),
    } : job));
  }
  if (path === "/notifications-read") {
    const key = cacheKey("/notifications-list", undefined);
    const current = await readCache<{ items: Array<Record<string, unknown>>; unreadCount: number }>(key);
    if (current) {
      const wasUnread = current.items.some((item) => item.id === body.id && !item.readAt);
      await writeCache(key, {
        items: current.items.map((item) => item.id === body.id ? { ...item, readAt: new Date().toISOString() } : item),
        unreadCount: Math.max(0, current.unreadCount - (wasUnread ? 1 : 0)),
      });
    }
  }
}

class ApiResponseError extends Error {
  public constructor(public readonly status: number, message: string) { super(message); }
}
