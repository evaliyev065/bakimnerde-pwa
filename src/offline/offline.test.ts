import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api";
import { pendingCount, readCache, removeOutbox } from "./storage";

describe("saha PWA 2.0 offline outbox", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it("ağ yokken saha formunu kuyruğa ve okunabilir yerel cache'e kaydeder", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    const result = await apiRequest<{ queued: boolean; id: string }>("/job-field-report-save", {
      method: "POST",
      body: JSON.stringify({
        jobId: "job-offline-1", serviceType: "FAULT_REPAIR", equipmentCondition: "LIMITED",
        faultCategory: "ELECTRICAL", actionTaken: "PART_REQUIRED", safetyResult: "SAFE",
        inputVoltage: 400, outputVoltage: 398, notes: "Çevrimdışı saha kaydı",
      }),
    });
    expect(result.queued).toBe(true);
    expect(await pendingCount()).toBeGreaterThan(0);
    const cached = await readCache<{ completed: boolean }>(`/job-field-report-get:${JSON.stringify({ jobId: "job-offline-1" })}`);
    expect(cached?.completed).toBe(true);
    await removeOutbox(result.id);
    vi.unstubAllGlobals();
  });

  it("REST API kapatıldıktan sonra son iş listesini cache'den açar", async () => {
    const jobs = [{ documentId: "job-cache-1", id: "XYZ-101", station: "Merkez", status: "ASSIGNED" }];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: jobs }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));
    await expect(apiRequest("/jobs-list")).resolves.toEqual(jobs);

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("REST API kapalı"); }));
    await expect(apiRequest("/jobs-list")).resolves.toEqual(jobs);
    vi.unstubAllGlobals();
  });
});
