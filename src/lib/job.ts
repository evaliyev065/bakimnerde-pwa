import type { Job, JobStatus } from "../domain/types";

export const statusLabels: Record<JobStatus, string> = {
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Sahada işlemde",
  ADDITIONAL_SUPPLY: "Ek tedarik sürecinde",
  MAINTENANCE_DONE: "Bakım tamamlandı",
  MAINTENANCE_APPROVED: "Bakım onaylandı",
  CPO_APPROVAL: "CPO onayında",
  PAID: "Ödeme tamamlandı",
  CLOSED: "Kapandı",
};

export function formatDate(value?: string): string {
  if (!value) return "Planlanmadı";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function jobLocation(job: Job): string {
  return [job.district, job.city].filter(Boolean).join(", ");
}

export function jobAssetLabel(job: Job): string {
  if (job.maintenanceTarget !== "STATION") return [job.charger, job.chargerModel].filter(Boolean).join(" · ") || "Şarj cihazı";
  return job.stationMaintenanceArea === "GRID_CONNECTION" ? "Bölgesel şebeke bağlantısı" : "İstasyonun genel parçaları";
}

export function jobTargetLabel(job: Job): string {
  return job.maintenanceTarget === "STATION" ? "İSTASYON" : "CİHAZ";
}

export function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
}
