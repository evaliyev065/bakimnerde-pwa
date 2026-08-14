import type { Job, JobStatus } from "../domain/types";
import type { AppLanguage } from "../app/PreferencesContext";

const statusLabels: Record<JobStatus, [string, string]> = {
  ASSIGNED: ["Atandı", "Assigned"],
  IN_PROGRESS: ["Sahada işlemde", "In progress on site"],
  ADDITIONAL_SUPPLY: ["Ek tedarik sürecinde", "Additional supply in progress"],
  MAINTENANCE_DONE: ["Bakım tamamlandı", "Maintenance completed"],
  MAINTENANCE_APPROVED: ["Bakım onaylandı", "Maintenance approved"],
  CPO_APPROVAL: ["CPO onayında", "Awaiting CPO approval"],
  PAID: ["Ödeme tamamlandı", "Payment completed"],
  CLOSED: ["Kapandı", "Closed"],
};

export function statusLabel(status: JobStatus, language: AppLanguage): string {
  return statusLabels[status][language === "tr" ? 0 : 1];
}

export function formatDate(value: string | undefined, locale: string, language: AppLanguage): string {
  if (!value) return language === "tr" ? "Planlanmadı" : "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language === "tr" ? "Planlanmadı" : "Not scheduled";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function jobLocation(job: Job): string {
  return [job.district, job.city].filter(Boolean).join(", ");
}

export function jobAssetLabel(job: Job, language: AppLanguage): string {
  if (job.maintenanceTarget !== "STATION") return job.charger?.trim() || (language === "tr" ? "Cihaz kodu belirtilmedi" : "Device code not specified");
  return job.stationMaintenanceArea === "GRID_CONNECTION"
    ? language === "tr" ? "Bölgesel şebeke bağlantısı" : "Regional grid connection"
    : language === "tr" ? "İstasyonun genel parçaları" : "General station components";
}

export function jobTargetLabel(job: Job, language: AppLanguage): string {
  if (language === "tr") return job.maintenanceTarget === "STATION" ? "İSTASYON" : "CİHAZ";
  return job.maintenanceTarget === "STATION" ? "STATION" : "DEVICE";
}

export function jobScheduleTime(job: Job): number {
  const value = job.appointmentAt ?? job.givenDurationAt;
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
}
