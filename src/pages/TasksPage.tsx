import { CalendarClock, ChevronRight, ClipboardCheck, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useJobs } from "../jobs/JobsContext";
import { formatDate, jobAssetLabel, jobLocation, statusLabels } from "../lib/job";

export function TasksPage() {
  const { jobs, loading, error, refresh } = useJobs();
  const [filter, setFilter] = useState<"ACTIVE" | "DONE">("ACTIVE");
  const visible = useMemo(() => jobs.filter((job) =>
    filter === "ACTIVE"
      ? ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status)
      : !["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status)), [filter, jobs]);

  return <section className="page-stack">
    <div className="page-heading"><div><p className="kicker">ATANMIŞ İŞLER</p><h1>Görevlerim</h1><span>Yalnız size atanan saha işleri burada görünür.</span></div><button className="square-button" onClick={() => void refresh()} aria-label="Yenile"><RefreshCw /></button></div>
    <div className="segmented"><button className={filter === "ACTIVE" ? "is-active" : ""} onClick={() => setFilter("ACTIVE")}>Aktif görevler</button><button className={filter === "DONE" ? "is-active" : ""} onClick={() => setFilter("DONE")}>Geçmiş</button></div>
    {error && <div className="form-error">{error}</div>}
    {loading && <div className="loading-card">Görevler yükleniyor…</div>}
    {!loading && visible.length === 0 && <div className="empty-card"><span><ClipboardCheck /></span><h2>Bu listede görev yok</h2><p>Taşeron yönetimi sizi bir işe atadığında görev burada otomatik görünür.</p></div>}
    <div className="jobs-list">{visible.map((job) => <Link to={`/task/${job.documentId}`} className="job-row" key={job.documentId}>
      <div className={`job-status-rail status-${job.status.toLocaleLowerCase("en-US")}`} />
      <div className="job-row__main"><div><b>{job.id}</b><em>{statusLabels[job.status]}</em></div><h2>{job.station}</h2><p>{jobAssetLabel(job)}</p><span>{jobLocation(job)}</span></div>
      <div className="job-row__time"><CalendarClock /><b>{formatDate(job.appointmentAt)}</b><ChevronRight /></div>
    </Link>)}</div>
  </section>;
}
