import { CalendarClock, ChevronRight, ClipboardCheck, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useJobs } from "../jobs/JobsContext";
import { formatDate, jobAssetLabel, jobLocation, statusLabel } from "../lib/job";
import { usePreferences } from "../app/PreferencesContext";

export function TasksPage() {
  const { language, locale, t } = usePreferences();
  const { jobs, loading, error, refresh } = useJobs();
  const [filter, setFilter] = useState<"ACTIVE" | "DONE">("ACTIVE");
  const visible = useMemo(() => jobs.filter((job) =>
    filter === "ACTIVE"
      ? ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status)
      : !["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status)), [filter, jobs]);

  return <section className="page-stack">
    <div className="page-heading"><div><p className="kicker">{t("ATANMIŞ İŞLER", "ASSIGNED JOBS")}</p><h1>{t("Görevlerim", "My tasks")}</h1><span>{t("Yalnız size atanan saha işleri burada görünür.", "Only field jobs assigned to you appear here.")}</span></div><button className="square-button" onClick={() => void refresh()} aria-label={t("Yenile", "Refresh")}><RefreshCw /></button></div>
    <div className="segmented"><button className={filter === "ACTIVE" ? "is-active" : ""} onClick={() => setFilter("ACTIVE")}>{t("Aktif görevler", "Active tasks")}</button><button className={filter === "DONE" ? "is-active" : ""} onClick={() => setFilter("DONE")}>{t("Geçmiş", "History")}</button></div>
    {error && <div className="form-error">{error}</div>}
    {loading && <div className="loading-card">{t("Görevler yükleniyor…", "Loading tasks…")}</div>}
    {!loading && visible.length === 0 && <div className="empty-card"><span><ClipboardCheck /></span><h2>{t("Bu listede görev yok", "There are no tasks in this list")}</h2><p>{t("Taşeron yönetimi sizi bir işe atadığında görev burada otomatik görünür.", "A task will appear here automatically when contractor management assigns it to you.")}</p></div>}
    <div className="jobs-list">{visible.map((job) => <Link to={`/task/${job.documentId}`} className="job-row" key={job.documentId}>
      <div className={`job-status-rail status-${job.status.toLocaleLowerCase("en-US")}`} />
      <div className="job-row__main"><div><b>{job.id}</b><em>{statusLabel(job.status, language)}</em></div><h2>{job.station}</h2><p>{jobAssetLabel(job, language)}</p><span>{jobLocation(job)}</span></div>
      <div className="job-row__time"><CalendarClock /><b>{formatDate(job.appointmentAt, locale, language)}</b><ChevronRight /></div>
    </Link>)}</div>
  </section>;
}
