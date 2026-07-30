import {
  ArrowLeft, CalendarClock, Camera, Check, CheckCircle2, ClipboardPenLine,
  MapPin, MessageSquare, PackagePlus, Play, RefreshCw, ShieldCheck, Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Evidence, FieldReport } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";
import { formatDate, jobAssetLabel, jobLocation, jobTargetLabel, statusLabels } from "../lib/job";

const safetyItems = [
  "KKD ekipmanlarımı kontrol ettim",
  "Enerji izolasyonunu doğruladım",
  "Çalışma alanını güvenli hale getirdim",
];

export function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const { findJob, loading, refresh } = useJobs();
  const job = findJob(taskId);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async () => {
    if (!taskId) return;
    try {
      const body = JSON.stringify({ jobId: taskId });
      const [media, form] = await Promise.all([
        apiRequest<Evidence[]>("/job-evidence-list", { method: "POST", body }),
        apiRequest<FieldReport | null>("/job-field-report-get", { method: "POST", body }),
      ]);
      setEvidence(media);
      setReport(form);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "İş ilerlemesi alınamadı.");
    }
  }, [taskId]);

  useEffect(() => { void loadProgress(); }, [loadProgress]);

  const evidenceCounts = useMemo(() => ({
    before: evidence.filter((item) => item.phase === "BEFORE").length,
    after: evidence.filter((item) => item.phase === "AFTER").length,
    branded: evidence.filter((item) => item.phase === "BRANDED").length,
  }), [evidence]);
  const evidenceComplete = evidenceCounts.before === 6 && evidenceCounts.after === 6 && evidenceCounts.branded === 1;
  const appointmentReady = Boolean(job?.contractorAcceptedAt && job.appointmentAt && new Date(job.appointmentAt) <= new Date());

  async function changeStatus(status: "IN_PROGRESS" | "MAINTENANCE_DONE") {
    if (!job) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/jobs-status-change", {
        method: "POST",
        body: JSON.stringify({ id: job.documentId, status }),
      });
      await Promise.all([refresh(), loadProgress()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Görev durumu güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !job) return <div className="loading-card">Görev yükleniyor…</div>;
  if (!job) return <section className="empty-card"><span><Wrench /></span><h2>Görev bulunamadı</h2><p>Bu iş size atanmamış veya atama değiştirilmiş olabilir.</p><Link className="text-link" to="/tasks">Görevlerime dön</Link></section>;

  return <section className="task-detail page-stack">
    <Link to="/tasks" className="back"><ArrowLeft /> Görevlerim</Link>
    <div className="detail-title"><div><p className="kicker">{job.id} · ÇEVRİM {job.workflowCycle}</p><h1>{job.station}</h1><p className="address"><MapPin /> {jobLocation(job)}</p></div><span className={`status-pill status-${job.status.toLocaleLowerCase("en-US")}`}>{statusLabels[job.status]}</span></div>
    <div className="job-facts">
      <article><small>{jobTargetLabel(job)}</small><b>{jobAssetLabel(job)}</b><span>{job.maintenanceTarget === "STATION" ? "İstasyon altyapı bakımı" : "Araca takılan şarj cihazı"}</span></article>
      <article><small>RANDEVU</small><b>{formatDate(job.appointmentAt)}</b><span>{job.cpo}</span></article>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}

    {job.status === "ASSIGNED" && <section className="checklist card-section">
      <div className="card-section__heading"><span><ShieldCheck /></span><div><h2>Güvenli başlangıç</h2><p>Randevu zamanı geldiğinde tüm kontrolleri tamamlayın.</p></div></div>
      {safetyItems.map((item, index) => <label key={item}><input type="checkbox" checked={checks[index]} onChange={() => setChecks((current) => current.map((value, checkIndex) => checkIndex === index ? !value : value))} /><span><Check /></span>{item}</label>)}
      {!appointmentReady && <div className="notice-bar"><CalendarClock /> Görev, onaylı randevu zamanı geldiğinde başlatılabilir: {formatDate(job.appointmentAt)}</div>}
      <button className="primary-action" disabled={busy || !appointmentReady || checks.some((value) => !value)} onClick={() => void changeStatus("IN_PROGRESS")}><Play /> {busy ? "Başlatılıyor…" : "Bakıma Başla"}</button>
    </section>}

    <div className="work-areas">
      <Link to={`/task/${job.documentId}/form`} className={report?.completed ? "is-complete" : ""}><span><ClipboardPenLine /></span><div><small>AYRI ÇALIŞMA ALANI</small><h2>Saha işlem formu</h2><p>Arıza, yapılan işlem, ölçüm ve güvenlik sonucunu kaydedin.</p><b>{report?.completed ? <><CheckCircle2 /> Form kaydedildi</> : "Formu doldur"}</b></div></Link>
      <Link to={`/task/${job.documentId}/photos`} className={evidenceComplete ? "is-complete" : ""}><span><Camera /></span><div><small>AYRI YÜKLEME ALANI</small><h2>Fotoğraf kanıtları</h2><p>6 önce, 6 sonra ve 1 markalı saha fotoğrafını ekleyin.</p><b>{evidenceComplete ? <><CheckCircle2 /> Fotoğraflar tamam</> : `${evidence.length}/13 fotoğraf`}</b></div></Link>
      <Link to={`/task/${job.documentId}/additional-supply`}><span><PackagePlus /></span><div><small>GÖREV MENÜSÜ</small><h2>Ek tedarik</h2><p>Yalnız ek parça veya işlem gerektiğinde türünü seçin.</p><b>Ek işlem seç</b></div></Link>
      <Link to={`/task/${job.documentId}/chat`}><span><MessageSquare /></span><div><small>ORTAK İLETİŞİM</small><h2>İş sohbeti</h2><p>Kendi yönetiminiz ve Bakımnerde ile iletişime geçin.</p><b>Sohbeti aç</b></div></Link>
    </div>

    <section className="progress-card">
      <div className="card-section__heading"><span><RefreshCw /></span><div><h2>Tamamlanma kontrolü</h2><p>İki alan da eksiksiz olmalıdır.</p></div></div>
      <div className="progress-checks">
        <span className={job.maintenanceStartedAt ? "done" : ""}>{job.maintenanceStartedAt ? <CheckCircle2 /> : <i />}{job.maintenanceStartedAt ? `Bakıma başlandı · ${formatDate(job.maintenanceStartedAt)}` : "Bakıma Başla aksiyonu bekleniyor"}</span>
        <span className={report?.completed ? "done" : ""}>{report?.completed ? <CheckCircle2 /> : <i />}{report?.completed ? "Saha formu tamam" : "Saha formu bekleniyor"}</span>
        <span className={evidenceComplete ? "done" : ""}>{evidenceComplete ? <CheckCircle2 /> : <i />}{evidenceCounts.before}/6 önce · {evidenceCounts.after}/6 sonra · {evidenceCounts.branded}/1 markalı</span>
      </div>
      {job.status === "IN_PROGRESS" && <button className="complete-button" disabled={busy || !report?.completed || !evidenceComplete} onClick={() => void changeStatus("MAINTENANCE_DONE")}><CheckCircle2 /> {busy ? "Gönderiliyor…" : "Bakımı tamamla ve onaya gönder"}</button>}
      {job.status === "ADDITIONAL_SUPPLY" && <div className="supply-status-note"><PackagePlus /><div><b>Ek tedarik sürecinde</b><span>Parça temin edilene kadar bakım işi tamamlanmış sayılmaz ve işlem açık kalır.</span></div></div>}
      {!["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status) && <div className="success-banner"><CheckCircle2 /><div><b>Saha işlemi tamamlandı</b><span>İş, Bakımnerde ve CPO onay akışında ilerliyor.</span></div></div>}
    </section>
  </section>;
}
