import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldAuthProvider } from "../auth/FieldAuthContext";
import { FIELD_TOKEN_KEY } from "../lib/api";
import { App } from "./App";

const principal = {
  userId: "000000000000000000000007",
  tenantId: "000000000000000000000003",
  tenantKey: "wattarya-teknik",
  tenantName: "WattaryaTeknik",
  tenantType: "CONTRACTOR",
  name: "Ahmet Kaya",
  email: "saha@wattaryateknik.test",
  role: "FIELD_WORKER",
};
const job = {
  documentId: "000000000000000000000100",
  id: "BN-2481",
  station: "İstanbul Havalimanı P3",
  city: "İstanbul",
  district: "Arnavutköy",
  maintenanceTarget: "DEVICE",
  charger: "TR-VGE-3482",
  chargerModel: "VX-180",
  status: "ASSIGNED",
  appointmentAt: "2026-07-25T08:00:00.000Z",
  deadlineAt: "2026-08-01T08:00:00.000Z",
  contractorAcceptedAt: "2026-07-24T08:00:00.000Z",
  workflowCycle: 1,
  cpo: "Wattarya",
  contractor: "Bakımnerde Saha Ağı",
  fieldWorkerUserId: principal.userId,
  fieldWorkerName: principal.name,
};

describe("Bakımnerde saha PWA 2.0", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it("oturum yokken saha personeli girişini gösterir", () => {
    renderApp("/login");
    expect(screen.getByText("Vardiyanıza başlayın")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saha alanına gir/i })).toBeInTheDocument();
  });

  it("saha oturumunu geri yükleyip yalnız atanmış işi gösterir", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    mockApi();
    renderApp("/dashboard");
    expect(await screen.findByText("İstanbul Havalimanı P3")).toBeInTheDocument();
    expect(screen.getByText("1 aktif görev")).toBeInTheDocument();
    expect(screen.getByText(/WattaryaTeknik/)).toBeInTheDocument();
  });

  it("iş detayında form ve fotoğrafı ayrı çalışma alanları olarak sunar", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    mockApi();
    renderApp(`/task/${job.documentId}`);
    expect(await screen.findByRole("heading", { name: "Saha işlem formu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fotoğraf kanıtları" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bakıma başla/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ek tedarik" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "İş sohbeti" })).toBeInTheDocument();
  });

  it("istasyon şebeke bakımını cihaz göreviyle karıştırmadan gösterir", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    const stationJob = { ...job, maintenanceTarget: "STATION", stationMaintenanceArea: "GRID_CONNECTION", charger: null, chargerModel: null };
    mockApi(stationJob);
    renderApp(`/task/${job.documentId}`);
    expect(await screen.findByText("Bölgesel şebeke bağlantısı")).toBeInTheDocument();
    expect(screen.getByText("İstasyon altyapı bakımı")).toBeInTheDocument();
  });
});

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><FieldAuthProvider><App /></FieldAuthProvider></MemoryRouter>);
}

function mockApi(jobData: Record<string, unknown> = job) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/auth-me")) return apiResponse(principal);
    if (url.endsWith("/jobs-list")) return apiResponse([jobData]);
    if (url.endsWith("/job-evidence-list")) return apiResponse([]);
    if (url.endsWith("/job-field-report-get")) return apiResponse(null);
    return apiResponse(null, false);
  }));
}

function apiResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => ok ? { data } : { error: { message: "Test hatası" } } } as Response;
}
