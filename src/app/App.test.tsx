import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldAuthProvider } from "../auth/FieldAuthContext";
import { FIELD_TOKEN_KEY } from "../lib/api";
import { App } from "./App";
import { LANGUAGE_STORAGE_KEY, PreferencesProvider, THEME_STORAGE_KEY } from "./PreferencesContext";

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
  status: "ASSIGNED",
  appointmentAt: "2026-07-25T08:00:00.000Z",
  givenDurationAt: "2026-07-30T08:00:00.000Z",
  contractorAcceptedAt: "2026-07-24T08:00:00.000Z",
  workflowCycle: 1,
  cpo: "Wattarya",
  contractor: "Bakımnerde Saha Ağı",
  fieldWorkerUserId: principal.userId,
  fieldWorkerName: principal.name,
};

describe("Bakımnerde saha PWA 2.0", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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

  it("dil ve tema tercihlerini erişilebilir düğmelerle değiştirip kalıcılaştırır", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    mockApi();
    renderApp("/dashboard");

    fireEvent.click(await screen.findByRole("button", { name: "Dili İngilizce yap" }));
    expect(await screen.findByText("Home")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "en");
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });
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
    expect(screen.getByText("VERİLEN SÜRE")).toBeInTheDocument();
    expect(screen.getByText("TR-VGE-3482")).toBeInTheDocument();
    expect(screen.queryByText("VX-180")).not.toBeInTheDocument();
  });

  it("istasyon şebeke bakımını cihaz göreviyle karıştırmadan gösterir", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    const stationJob = { ...job, maintenanceTarget: "STATION", stationMaintenanceArea: "GRID_CONNECTION", charger: null };
    mockApi(stationJob);
    renderApp(`/task/${job.documentId}`);
    expect(await screen.findByText("Bölgesel şebeke bağlantısı")).toBeInTheDocument();
    expect(screen.getByText("İstasyon altyapı bakımı")).toBeInTheDocument();
  });

  it("sahaya ulaşan parçanın fiziksel teslimini doğrular", async () => {
    sessionStorage.setItem(FIELD_TOKEN_KEY, "field-token");
    const request = {
      id: "supply-1", type: "FAN_REPLACEMENT", description: "Yeni fan",
      partSupplyStatus: "AWAITING_FIELD_CONFIRMATION",
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse(principal);
      if (url.endsWith("/jobs-list")) return apiResponse([job]);
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/additional-requests-list")) return apiResponse([request]);
      if (url.endsWith("/additional-requests-field-confirm")) return apiResponse({ id: request.id, status: "SUPPLIED" });
      return apiResponse(null, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp(`/task/${job.documentId}/additional-supply`);
    fireEvent.click(await screen.findByRole("button", { name: /fiziksel teslimi doğrula/i }));

    expect(await screen.findByText("Fiziksel teslim doğrulandı.")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/additional-requests-field-confirm"),
      expect.objectContaining({ method: "POST" }),
    ));
  });
});

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><PreferencesProvider><FieldAuthProvider><App /></FieldAuthProvider></PreferencesProvider></MemoryRouter>);
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
