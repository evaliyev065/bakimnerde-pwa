import {
  ArrowLeft, CalendarClock, Camera, Check, CheckCircle2, ClipboardPenLine,
  CreditCard, MapPin, MessageSquare, PackageCheck, PackagePlus, Play, RefreshCw, ShieldCheck, Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { AdditionalRequest, Evidence, FieldReport, Job } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";
import { formatDate, jobAssetLabel, jobLocation, jobTargetLabel, statusLabel } from "../lib/job";
import { usePreferences } from "../app/PreferencesContext";

export function TaskDetailPage() {
  const { language, locale, t } = usePreferences();
  const { taskId = "" } = useParams();
  const { findJob, loading, refresh } = useJobs();
  const job = findJob(taskId);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [requests, setRequests] = useState<AdditionalRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const safetyItems = [
    t("KKD ekipmanlarımı kontrol ettim", "I checked my PPE"),
    t("Enerji izolasyonunu doğruladım", "I verified energy isolation"),
    t("Çalışma alanını güvenli hale getirdim", "I secured the work area"),
  ];

  const loadProgress = useCallback(async () => {
    if (!taskId) return;
    try {
      const body = JSON.stringify({ jobId: taskId });
      const [media, form, additions] = await Promise.all([
        apiRequest<Evidence[]>("/job-evidence-list", { method: "POST", body }),
        apiRequest<FieldReport | null>("/job-field-report-get", { method: "POST", body }),
        apiRequest<AdditionalRequest[]>("/additional-requests-list", { method: "POST", body }),
      ]);
      setEvidence(media);
      setReport(form);
      setRequests(additions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("İş ilerlemesi alınamadı.", "Job progress could not be loaded."));
    }
  }, [t, taskId]);

  useEffect(() => { void loadProgress(); }, [loadProgress]);

  const evidenceCounts = useMemo(() => ({
    before: evidence.filter((item) => item.phase === "BEFORE").length,
    after: evidence.filter((item) => item.phase === "AFTER").length,
    branded: evidence.filter((item) => item.phase === "BRANDED").length,
  }), [evidence]);
  const evidenceComplete = evidenceCounts.before === 6 && evidenceCounts.after === 6 && evidenceCounts.branded === 1;
  const beforeComplete = evidenceCounts.before === 6;
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
      setError(reason instanceof Error ? reason.message : t("Görev durumu güncellenemedi.", "Task status could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !job) return <div className="loading-card">{t("Görev yükleniyor…", "Loading task…")}</div>;
  if (!job) return <section className="empty-card"><span><Wrench /></span><h2>{t("Görev bulunamadı", "Task not found")}</h2><p>{t("Bu iş size atanmamış veya atama değiştirilmiş olabilir.", "This job may not be assigned to you, or its assignment may have changed.")}</p><Link className="text-link" to="/tasks">{t("Görevlerime dön", "Back to my tasks")}</Link></section>;

  return <section className="task-detail page-stack">
    <Link to="/tasks" className="back"><ArrowLeft /> {t("Görevlerim", "My tasks")}</Link>
    <div className="detail-title"><div><p className="kicker">{job.id} · {t("ÇEVRİM", "CYCLE")} {job.workflowCycle}</p><h1>{job.station}</h1><p className="address"><MapPin /> {jobLocation(job)}</p></div><span className={`status-pill status-${job.status.toLocaleLowerCase("en-US")}`}>{statusLabel(job.status, language)}</span></div>
    <div className="job-facts">
      <article><small>{jobTargetLabel(job, language)}</small><b>{jobAssetLabel(job, language)}</b><span>{job.maintenanceTarget === "STATION" ? t("İstasyon altyapı bakımı", "Station infrastructure maintenance") : t("Araca takılan şarj cihazı", "EV charging device")}</span></article>
      <article><small>{t("RANDEVU", "APPOINTMENT")}</small><b>{formatDate(job.appointmentAt, locale, language)}</b><span>{job.cpo}</span></article>
      <article><small>{t("VERİLEN SÜRE", "ALLOTTED TIME")}</small><b>{formatDate(job.givenDurationAt, locale, language)}</b><span>{t("Teknik servis için tanımlanan süre", "Time allotted to technical service")}</span></article>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}

    {job.status === "ASSIGNED" && <section className="checklist card-section">
      <div className="card-section__heading"><span><ShieldCheck /></span><div><h2>{t("Güvenli başlangıç", "Safe start")}</h2><p>{t("Randevu zamanı geldiğinde tüm kontrolleri tamamlayın.", "Complete all checks when the appointment time arrives.")}</p></div></div>
      {safetyItems.map((item, index) => <label key={item}><input type="checkbox" checked={checks[index]} onChange={() => setChecks((current) => current.map((value, checkIndex) => checkIndex === index ? !value : value))} /><span><Check /></span>{item}</label>)}
      {!appointmentReady && <div className="notice-bar"><CalendarClock /> {t("Görev, onaylı randevu zamanı geldiğinde başlatılabilir:", "The task can start when the approved appointment time arrives:")} {formatDate(job.appointmentAt, locale, language)}</div>}
      {!beforeComplete && <div className="notice-bar"><Camera /> {t("Bakıma başlamadan önce 6 bakım öncesi fotoğrafını yükleyin", "Upload 6 before-maintenance photos before starting maintenance")} ({evidenceCounts.before}/6).</div>}
      <button className="primary-action" disabled={busy || !appointmentReady || !beforeComplete || checks.some((value) => !value)} onClick={() => void changeStatus("IN_PROGRESS")}><Play /> {busy ? t("Başlatılıyor…", "Starting…") : t("Bakıma Başla", "Start maintenance")}</button>
    </section>}

    <div className="work-areas">
      <Link to={`/task/${job.documentId}/form`} aria-disabled={!job.maintenanceStartedAt} onClick={(event) => { if (!job.maintenanceStartedAt) event.preventDefault(); }} className={`${report?.completed ? "is-complete" : ""} ${!job.maintenanceStartedAt ? "is-disabled" : ""}`.trim()}><span><ClipboardPenLine /></span><div><small>{t("BAKIM SONRASI ALAN", "POST-MAINTENANCE AREA")}</small><h2>{t("Saha işlem formu", "Field service form")}</h2><p>{job.maintenanceStartedAt ? t("Arıza, yapılan işlem, ölçüm ve güvenlik sonucunu kaydedin.", "Record the fault, work performed, measurements, and safety result.") : t("Bakıma Başla işleminden sonra açılır.", "Available after you start maintenance.")}</p><b>{report?.completed ? <><CheckCircle2 /> {t("Form kaydedildi", "Form saved")}</> : job.maintenanceStartedAt ? t("Formu doldur", "Complete form") : t("Kilitli", "Locked")}</b></div></Link>
      <Link to={`/task/${job.documentId}/photos`} className={evidenceComplete ? "is-complete" : ""}><span><Camera /></span><div><small>{t("AYRI YÜKLEME ALANI", "SEPARATE UPLOAD AREA")}</small><h2>{t("Fotoğraf kanıtları", "Photo evidence")}</h2><p>{t("6 önce, 6 sonra ve 1 markalı saha fotoğrafını ekleyin.", "Add 6 before, 6 after, and 1 branded field photo.")}</p><b>{evidenceComplete ? <><CheckCircle2 /> {t("Fotoğraflar tamam", "Photos complete")}</> : `${evidence.length}/13 ${t("fotoğraf", "photos")}`}</b></div></Link>
      <Link to={`/task/${job.documentId}/additional-supply`} aria-disabled={!job.maintenanceStartedAt} onClick={(event) => { if (!job.maintenanceStartedAt) event.preventDefault(); }} className={!job.maintenanceStartedAt ? "is-disabled" : ""}><span><PackagePlus /></span><div><small>{t("GÖREV MENÜSÜ", "TASK MENU")}</small><h2>{t("Ek tedarik", "Additional supply")}</h2><p>{job.maintenanceStartedAt ? t("Yalnız ek parça veya işlem gerektiğinde türünü seçin.", "Select a type only when an additional part or service is needed.") : t("Bakım başladıktan sonra ek tedarik alanı açılır.", "Additional supply becomes available after maintenance starts.")}</p><b>{job.maintenanceStartedAt ? t("Ek işlem seç", "Select additional service") : t("Kilitli", "Locked")}</b></div></Link>
      <Link to={`/task/${job.documentId}/chat`}><span><MessageSquare /></span><div><small>{t("ORTAK İLETİŞİM", "SHARED COMMUNICATION")}</small><h2>{t("İş sohbeti", "Job chat")}</h2><p>{t("Kendi yönetiminiz ve Bakımnerde ile iletişime geçin.", "Contact your management and Bakımnerde.")}</p><b>{t("Sohbeti aç", "Open chat")}</b></div></Link>
    </div>

    <JobProgressBars job={job} requests={requests} />

    <section className="progress-card completion-card">
      <div className="card-section__heading"><span><RefreshCw /></span><div><h2>{t("Tamamlanma kontrolü", "Completion check")}</h2><p>{t("İki alan da eksiksiz olmalıdır.", "Both areas must be complete.")}</p></div></div>
      <div className="progress-checks">
        <span className={job.maintenanceStartedAt ? "done" : ""}>{job.maintenanceStartedAt ? <CheckCircle2 /> : <i />}{job.maintenanceStartedAt ? `${t("Bakıma başlandı", "Maintenance started")} · ${formatDate(job.maintenanceStartedAt, locale, language)}` : t("Bakıma Başla aksiyonu bekleniyor", "Waiting for Start maintenance action")}</span>
        <span className={report?.completed ? "done" : ""}>{report?.completed ? <CheckCircle2 /> : <i />}{report?.completed ? t("Saha formu tamam", "Field form complete") : t("Saha formu bekleniyor", "Field form pending")}</span>
        <span className={evidenceComplete ? "done" : ""}>{evidenceComplete ? <CheckCircle2 /> : <i />}{evidenceCounts.before}/6 {t("önce", "before")} · {evidenceCounts.after}/6 {t("sonra", "after")} · {evidenceCounts.branded}/1 {t("markalı", "branded")}</span>
      </div>
      {job.status === "IN_PROGRESS" && <button className="complete-button" disabled={busy || !report?.completed || !evidenceComplete} onClick={() => void changeStatus("MAINTENANCE_DONE")}><CheckCircle2 /> {busy ? t("Gönderiliyor…", "Sending…") : t("Bakımı tamamla ve onaya gönder", "Complete maintenance and submit for approval")}</button>}
      {job.status === "ADDITIONAL_SUPPLY" && <div className="supply-status-note"><PackagePlus /><div><b>{t("Ek tedarik sürecinde", "Additional supply in progress")}</b><span>{t("Parça temin edilene kadar bakım işi tamamlanmış sayılmaz ve işlem açık kalır.", "The maintenance remains open and incomplete until the part is supplied.")}</span></div></div>}
      {!["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(job.status) && <div className="success-banner"><CheckCircle2 /><div><b>{t("Saha işlemi tamamlandı", "Field service completed")}</b><span>{t("İş, Bakımnerde ve CPO onay akışında ilerliyor.", "The job is moving through the Bakımnerde and CPO approval flow.")}</span></div></div>}
    </section>
  </section>;
}

function JobProgressBars({ job, requests }: { job: Job; requests: AdditionalRequest[] }) {
  const { t } = usePreferences();
  const maintenanceSteps: Array<[string, boolean]> = [
    [t("Talep oluşturuldu", "Request created"), true],
    [t("Teknik Servise Atandı", "Assigned to Technical Service"), true],
    [t("Saha Personeline atandı", "Assigned to Field Worker"), Boolean(job.fieldWorkerUserId)],
    [t("Bakım başladı", "Maintenance started"), Boolean(job.maintenanceStartedAt)],
    [t("Bakım tamamlandı", "Maintenance completed"), Boolean(job.maintenanceCompletedAt) || ["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(job.status)],
    [t("Rapor onaylandı (Bakımnerde)", "Report approved (Bakımnerde)"), Boolean(job.platformApprovedAt) || ["MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(job.status)],
    [t("Rapor onaylandı (CPO)", "Report approved (CPO)"), Boolean(job.cpoApprovedAt) || ["CPO_APPROVAL", "PAID", "CLOSED"].includes(job.status)],
    [t("Talep kapatıldı", "Request closed"), Boolean(job.closedAt) || job.status === "CLOSED"],
  ];
  const paymentSteps: Array<[string, boolean]> = [
    [t("Ücret belirlendi", "Fee determined"), Number(job.amount ?? 0) > 0],
    [t("Ödeme Yapıldı (Bakımnerde → Teknik Servis)", "Payment made (Bakımnerde → Technical Service)"), Boolean(job.contractorPaidAt)],
  ];
  const supplySteps: Array<[string, boolean]> = requests.length === 0 ? [] : [
    [t("Talep oluşturuldu", "Request created"), true],
    [t("Fiyat belirlendi", "Price determined"), requests.every((item) => item.partSupplyStatus !== "PENDING_PRICING")],
    [t("Teminat son tarihi belirlendi", "Supply deadline determined"), requests.every((item) => Boolean(item.supplyDeadlineAt))],
    [t("Parça saha ekibine ulaştı", "Part reached the field team"), requests.every((item) => item.partSupplyStatus === "SUPPLIED")],
  ];
  const supplyOpen = requests.some((item) => item.partSupplyStatus !== "SUPPLIED");
  return <section className="mobile-progress-stack">
    <MobileProgress icon={<Wrench />} title={t("Bakım durumu", "Maintenance status")} badge={supplyOpen ? t("Ek Tedarik", "Additional Supply") : undefined} steps={maintenanceSteps} />
    <MobileProgress icon={<CreditCard />} title={t("Ödeme durumu", "Payment status")} steps={paymentSteps} />
    {supplySteps.length > 0 && <MobileProgress icon={<PackageCheck />} title={t("Ek Tedarik durumu", "Additional Supply status")} steps={supplySteps} />}
  </section>;
}

function MobileProgress({ icon, title, badge, steps }: { icon: ReactNode; title: string; badge?: string; steps: Array<[string, boolean]> }) {
  const completed = steps.filter(([, done]) => done).length;
  const percent = Math.round((completed / steps.length) * 100);
  return <article className="mobile-progress">
    <header><span>{icon}</span><b>{title}</b>{badge && <em>{badge}</em>}<strong>{percent}/100</strong></header>
    <div className="mobile-progress__bar"><i style={{ width: `${percent}%` }} /></div>
    <div className="mobile-progress__steps">{steps.map(([label, done]) => <span className={done ? "done" : ""} key={label}><i />{label}</span>)}</div>
  </article>;
}
