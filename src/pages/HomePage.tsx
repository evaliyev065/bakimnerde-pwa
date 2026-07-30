import { AlertTriangle, ArrowRight, CalendarClock, Camera, CheckCircle2, ChevronRight, ClipboardCheck, MapPin, PackagePlus, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { useJobs } from "../jobs/JobsContext";
import { formatDate, initials, jobAssetLabel, jobLocation, jobTargetLabel, statusLabels } from "../lib/job";

export function HomePage() {
  const { principal } = useFieldAuth();
  const { jobs, loading, error } = useJobs();
  if (!principal) return null;
  const active = jobs.filter((job) => ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status));
  const next = [...active].sort((left, right) =>
    new Date(left.appointmentAt ?? left.deadlineAt).getTime() - new Date(right.appointmentAt ?? right.deadlineAt).getTime())[0];
  const firstName = principal.name.split(" ")[0];

  return <>
    <section className="hello"><div><p>SAHA VARDİYASI</p><h1>Merhaba, {firstName}</h1><span>{principal.tenantName} · güvenli ve verimli bir gün dileriz.</span></div><Link to="/profile" aria-label="Profil"><span>{initials(principal.name)}</span><i /></Link></section>
    <section className="shift-card"><div className="shift-card__top"><span className="shift-icon"><Wrench /></span><div><small>CANLI İŞ AKIŞI</small><strong>{active.length} aktif görev</strong></div><b><i /> BAĞLI</b></div><div className="shift-stats"><span><strong>{jobs.filter((job) => job.status === "ASSIGNED").length}</strong><small>Atandı</small></span><span><strong>{jobs.filter((job) => job.status === "IN_PROGRESS").length}</strong><small>İşlemde</small></span><span><strong>{jobs.filter((job) => job.status === "ADDITIONAL_SUPPLY").length}</strong><small>Ek tedarik</small></span></div></section>
    {error && <div className="form-error home-error">{error}</div>}
    {loading && <div className="loading-card">Atanmış işleriniz yükleniyor…</div>}
    {!loading && next && <>
      <div className="section-title"><div><p>SIRADAKİ GÖREV</p><h2>Atanmış müdahale</h2></div><span className={next.status === "IN_PROGRESS" ? "live-chip" : "danger"}>{next.status === "IN_PROGRESS" ? <Wrench /> : <AlertTriangle />}{statusLabels[next.status]}</span></div>
      <Link className="next-task" to={`/task/${next.documentId}`}><div className="task-visual"><span>{next.maintenanceTarget === "STATION" ? "İST" : "DC"}</span><small>{jobTargetLabel(next)}</small></div><div className="task-content"><div><span className="task-code">{next.id}</span><span className="critical-dot">{next.status === "IN_PROGRESS" ? "SAHADA" : next.status === "ADDITIONAL_SUPPLY" ? "TEDARİK" : "ATANDI"}</span></div><h3>{next.station}</h3><p><MapPin /> {jobLocation(next)}</p><div className="task-meta"><span><CalendarClock /> {formatDate(next.appointmentAt)}</span></div></div><ChevronRight className="task-chevron" /></Link>
      <section className="safety"><span><ShieldCheck /></span><div><strong>Güvenlik kontrolünü unutma</strong><p>İşi başlatmadan önce enerji izolasyonu ve KKD adımlarını tamamla.</p></div><ArrowRight /></section>
    </>}
    {!loading && !next && <div className="empty-card compact"><span><ClipboardCheck /></span><h2>Aktif göreviniz yok</h2><p>Yeni saha ataması geldiğinde bu ekran otomatik güncellenir.</p></div>}
    <div className="section-title"><div><p>OPERASYON ÖZETİ</p><h2>Son görevler</h2></div><Link to="/tasks">Tümünü gör</Link></div>
    <div className="task-list">
      {jobs.slice(0, 3).map((job) => <Link to={`/task/${job.documentId}`} key={job.documentId}><span className={`task-state ${job.status === "IN_PROGRESS" ? "photo" : job.status === "ADDITIONAL_SUPPLY" ? "supply" : "done"}`}>{job.status === "IN_PROGRESS" ? <Camera /> : job.status === "ADDITIONAL_SUPPLY" ? <PackagePlus /> : <CheckCircle2 />}</span><div><strong>{job.id} · {job.station}</strong><small>{statusLabels[job.status]} · {jobAssetLabel(job)}</small></div><time>{formatDate(job.appointmentAt)}</time></Link>)}
      {jobs.length === 0 && <p className="list-empty">Henüz atanmış görev bulunmuyor.</p>}
    </div>
  </>;
}
