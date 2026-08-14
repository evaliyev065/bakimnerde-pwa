import { AlertTriangle, ArrowRight, CalendarClock, Camera, CheckCircle2, ChevronRight, ClipboardCheck, MapPin, PackagePlus, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { useJobs } from "../jobs/JobsContext";
import { formatDate, initials, jobAssetLabel, jobLocation, jobScheduleTime, jobTargetLabel, statusLabel } from "../lib/job";
import { usePreferences } from "../app/PreferencesContext";

export function HomePage() {
  const { language, locale, t } = usePreferences();
  const { principal } = useFieldAuth();
  const { jobs, loading, error } = useJobs();
  if (!principal) return null;
  const active = jobs.filter((job) => ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status));
  const next = [...active].sort((left, right) => jobScheduleTime(left) - jobScheduleTime(right))[0];
  const firstName = principal.name.split(" ")[0];

  return <>
    <section className="hello"><div><p>{t("SAHA VARDİYASI", "FIELD SHIFT")}</p><h1>{t("Merhaba", "Hello")}, {firstName}</h1><span>{principal.tenantName} · {t("güvenli ve verimli bir gün dileriz.", "have a safe and productive day.")}</span></div><Link to="/profile" aria-label={t("Profil", "Profile")}><span>{initials(principal.name)}</span><i /></Link></section>
    <section className="shift-card"><div className="shift-card__top"><span className="shift-icon"><Wrench /></span><div><small>{t("CANLI İŞ AKIŞI", "LIVE WORKFLOW")}</small><strong>{active.length} {t("aktif görev", "active tasks")}</strong></div><b><i /> {t("BAĞLI", "CONNECTED")}</b></div><div className="shift-stats"><span><strong>{jobs.filter((job) => job.status === "ASSIGNED").length}</strong><small>{t("Atandı", "Assigned")}</small></span><span><strong>{jobs.filter((job) => job.status === "IN_PROGRESS").length}</strong><small>{t("İşlemde", "In progress")}</small></span><span><strong>{jobs.filter((job) => job.status === "ADDITIONAL_SUPPLY").length}</strong><small>{t("Ek tedarik", "Additional supply")}</small></span></div></section>
    {error && <div className="form-error home-error">{error}</div>}
    {loading && <div className="loading-card">{t("Atanmış işleriniz yükleniyor…", "Loading your assigned jobs…")}</div>}
    {!loading && next && <>
      <div className="section-title"><div><p>{t("SIRADAKİ GÖREV", "NEXT TASK")}</p><h2>{t("Atanmış müdahale", "Assigned service")}</h2></div><span className={next.status === "IN_PROGRESS" ? "live-chip" : "danger"}>{next.status === "IN_PROGRESS" ? <Wrench /> : <AlertTriangle />}{statusLabel(next.status, language)}</span></div>
      <Link className="next-task" to={`/task/${next.documentId}`}><div className="task-visual"><span>{next.maintenanceTarget === "STATION" ? t("İST", "STN") : "DC"}</span><small>{jobTargetLabel(next, language)}</small></div><div className="task-content"><div><span className="task-code">{next.id}</span><span className="critical-dot">{next.status === "IN_PROGRESS" ? t("SAHADA", "ON SITE") : next.status === "ADDITIONAL_SUPPLY" ? t("TEDARİK", "SUPPLY") : t("ATANDI", "ASSIGNED")}</span></div><h3>{next.station}</h3><p><MapPin /> {jobLocation(next)}</p><div className="task-meta"><span><CalendarClock /> {formatDate(next.appointmentAt, locale, language)}</span></div></div><ChevronRight className="task-chevron" /></Link>
      <section className="safety"><span><ShieldCheck /></span><div><strong>{t("Güvenlik kontrolünü unutma", "Remember the safety check")}</strong><p>{t("İşi başlatmadan önce enerji izolasyonu ve KKD adımlarını tamamla.", "Complete energy isolation and PPE steps before starting the job.")}</p></div><ArrowRight /></section>
    </>}
    {!loading && !next && <div className="empty-card compact"><span><ClipboardCheck /></span><h2>{t("Aktif göreviniz yok", "You have no active tasks")}</h2><p>{t("Yeni saha ataması geldiğinde bu ekran otomatik güncellenir.", "This screen updates automatically when a new field assignment arrives.")}</p></div>}
    <div className="section-title"><div><p>{t("OPERASYON ÖZETİ", "OPERATIONS SUMMARY")}</p><h2>{t("Son görevler", "Recent tasks")}</h2></div><Link to="/tasks">{t("Tümünü gör", "View all")}</Link></div>
    <div className="task-list">
      {jobs.slice(0, 3).map((job) => <Link to={`/task/${job.documentId}`} key={job.documentId}><span className={`task-state ${job.status === "IN_PROGRESS" ? "photo" : job.status === "ADDITIONAL_SUPPLY" ? "supply" : "done"}`}>{job.status === "IN_PROGRESS" ? <Camera /> : job.status === "ADDITIONAL_SUPPLY" ? <PackagePlus /> : <CheckCircle2 />}</span><div><strong>{job.id} · {job.station}</strong><small>{statusLabel(job.status, language)} · {jobAssetLabel(job, language)}</small></div><time>{formatDate(job.appointmentAt, locale, language)}</time></Link>)}
      {jobs.length === 0 && <p className="list-empty">{t("Henüz atanmış görev bulunmuyor.", "No tasks have been assigned yet.")}</p>}
    </div>
  </>;
}
