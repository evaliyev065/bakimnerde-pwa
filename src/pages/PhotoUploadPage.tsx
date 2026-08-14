import { ArrowLeft, Camera, CheckCircle2, Download, ImagePlus, Info, LockKeyhole, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Evidence, EvidencePhase } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiDownload, apiRequest } from "../lib/api";
import { usePreferences, type AppLanguage } from "../app/PreferencesContext";

const phaseDetails: Record<EvidencePhase, { labels: [string, string]; target: number; descriptions: [string, string] }> = {
  BEFORE: { labels: ["Bakım öncesi", "Before maintenance"], target: 6, descriptions: ["Bakım hedefinin müdahale öncesi farklı açıları", "Different angles of the maintenance target before service"] },
  AFTER: { labels: ["Bakım sonrası", "After maintenance"], target: 6, descriptions: ["Tamamlanan iş ve test sonucu", "Completed work and test result"] },
  BRANDED: { labels: ["Bakımnerde markalı", "Bakımnerde branded"], target: 1, descriptions: ["Saha personeli ve bakım yapılan varlık", "Field worker and maintained asset"] },
};

function phaseLabel(phase: EvidencePhase, language: AppLanguage): string {
  return phaseDetails[phase].labels[language === "tr" ? 0 : 1];
}

function phaseDescription(phase: EvidencePhase, language: AppLanguage): string {
  return phaseDetails[phase].descriptions[language === "tr" ? 0 : 1];
}

export function PhotoUploadPage() {
  const { language, t } = usePreferences();
  const { taskId = "" } = useParams();
  const { findJob } = useJobs();
  const job = findJob(taskId);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [phase, setPhase] = useState<EvidencePhase>("BEFORE");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setEvidence(await apiRequest<Evidence[]>("/job-evidence-list", {
        method: "POST",
        body: JSON.stringify({ jobId: taskId }),
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Fotoğraflar alınamadı.", "Photos could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [t, taskId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (job?.maintenanceStartedAt && phase === "BEFORE") setPhase("AFTER");
    if (!job?.maintenanceStartedAt && phase !== "BEFORE") setPhase("BEFORE");
  }, [job?.maintenanceStartedAt, phase]);

  const counts = useMemo(() => Object.fromEntries((Object.keys(phaseDetails) as EvidencePhase[]).map((key) => [
    key, evidence.filter((item) => item.phase === key).length,
  ])) as Record<EvidencePhase, number>, [evidence]);
  const remaining = phaseDetails[phase].target - counts[phase];
  const phaseLocked = phase === "BEFORE" ? Boolean(job?.maintenanceStartedAt) : !job?.maintenanceStartedAt;

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some((file) => file.size > 12 * 1024 * 1024)) {
      setError(t("Her fotoğraf en fazla 12 MB olabilir.", "Each photo can be up to 12 MB."));
      event.target.value = "";
      return;
    }
    setError("");
    setFiles(selected.slice(0, Math.max(remaining, 0)));
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (phaseLocked || files.length === 0 || remaining <= 0) return;
    setUploading(true);
    setError("");
    try {
      for (const [index, file] of files.entries()) {
        const dataUrl = await imageFileToDataUrl(file, language);
        const [metadata, contentBase64] = dataUrl.split(",", 2);
        const mimeType = metadata?.match(/^data:([^;]+);base64$/)?.[1] ?? "image/jpeg";
        await apiRequest("/job-evidence-add", {
          method: "POST",
          body: JSON.stringify({
            jobId: taskId,
            phase,
            contentBase64,
            mimeType,
            fileName: file.name,
            description: description.trim() || `${phaseLabel(phase, language)} ${counts[phase] + index + 1}`,
          }),
        });
      }
      setFiles([]);
      setDescription("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Fotoğraf yüklenemedi.", "Photo could not be uploaded."));
    } finally {
      setUploading(false);
    }
  }

  async function downloadAll() {
    try { await apiDownload("/job-evidence-download-all", { jobId: taskId }, `${job?.id ?? taskId}-${language === "tr" ? "saha-fotograflari" : "field-photos"}.zip`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("Fotoğraflar indirilemedi.", "Photos could not be downloaded.")); }
  }

  if (!job && !loading) return <div className="empty-card"><h2>{t("Görev bulunamadı", "Task not found")}</h2><Link to="/tasks">{t("Görevlerime dön", "Back to my tasks")}</Link></div>;

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> {t("İş detayına dön", "Back to job details")}</Link>
    <div className="subpage-heading"><span><Camera /></span><div><p className="kicker">{job?.id ?? t("SAHA KANITI", "FIELD EVIDENCE")}</p><h1>{t("Fotoğraf yükleme", "Photo upload")}</h1><p>{t("Her fotoğraf ilgili işin güncel çevrimine kanıt olarak kaydedilir.", "Each photo is saved as evidence for the current cycle of the job.")}</p></div></div>
    <div className="photo-progress">{(Object.keys(phaseDetails) as EvidencePhase[]).map((key) => { const locked = key === "BEFORE" ? Boolean(job?.maintenanceStartedAt) : !job?.maintenanceStartedAt; return <button type="button" disabled={locked} className={`${phase === key ? "is-active" : ""} ${counts[key] === phaseDetails[key].target ? "is-complete" : ""}`} onClick={() => { setPhase(key); setFiles([]); }} key={key}><span>{locked ? <LockKeyhole /> : counts[key] === phaseDetails[key].target ? <CheckCircle2 /> : <Camera />}</span><b>{phaseLabel(key, language)}</b><small>{locked ? t("Kilitli", "Locked") : `${counts[key]}/${phaseDetails[key].target}`}</small></button>; })}</div>
    {loading ? <div className="loading-card">{t("Fotoğraflar yükleniyor…", "Loading photos…")}</div> : <form className="upload-card" onSubmit={upload}>
      <div className="upload-heading"><div><p className="kicker">{phaseLabel(phase, language)}</p><h2>{phaseDescription(phase, language)}</h2></div><b>{remaining > 0 ? `${remaining} ${t("eksik", "remaining")}` : t("Tamam", "Complete")}</b></div>
      {phaseLocked ? <div className="phase-locked"><LockKeyhole /><div><b>{phase === "BEFORE" ? t("Bakım öncesi aşaması kapandı", "Before-maintenance phase is closed") : t("Önce bakımı başlatın", "Start maintenance first")}</b><span>{phase === "BEFORE" ? t("Bakım başladıktan sonra öncesi fotoğrafı eklenemez.", "Before-maintenance photos cannot be added after maintenance starts.") : t("Form ve diğer fotoğraflar Bakıma Başla işleminden sonra açılır.", "The form and other photo phases become available after you start maintenance.")}</span></div></div> : remaining > 0 ? <>
        <label className="file-drop"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={selectFiles} /><span><ImagePlus /></span><b>{files.length > 0 ? `${files.length} ${t("fotoğraf seçildi", "photos selected")}` : t("Fotoğraf seç veya kamerayı aç", "Choose photos or open the camera")}</b><small>{t("JPG, PNG veya WebP · dosya başına en fazla 12 MB", "JPG, PNG, or WebP · up to 12 MB per file")}</small></label>
        <label><span>{t("Fotoğraf açıklaması", "Photo description")}</span><input maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("Örn. Sağ bağlantı terminali", "E.g. right connection terminal")} /></label>
        <div className="info-bar"><Info /> {t("Fotoğraflar tarayıcıda sıkıştırılarak yüklenir; seçilen aşama sonradan değiştirilemez.", "Photos are compressed in the browser before upload; the selected phase cannot be changed later.")}</div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-action" disabled={uploading || files.length === 0}><Upload /> {uploading ? t("Fotoğraflar yükleniyor…", "Uploading photos…") : `${files.length || ""} ${t("fotoğrafı yükle", "upload photos")}`}</button>
      </> : <div className="phase-complete"><CheckCircle2 /><div><b>{t("Bu aşama tamamlandı", "This phase is complete")}</b><span>{t("Yeni yükleme için diğer fotoğraf aşamasını seçin.", "Select another photo phase for a new upload.")}</span></div></div>}
    </form>}
    <section className="gallery-section">
      <div><h2>{t("Yüklenen kanıtlar", "Uploaded evidence")}</h2>{evidence.some((item) => item.downloadAvailable) && <button className="gallery-download" type="button" onClick={() => void downloadAll()}><Download /> {t("Tümünü indir", "Download all")}</button>}</div>
      {evidence.length === 0 ? <p className="gallery-empty">{t("Henüz fotoğraf yüklenmedi.", "No photos uploaded yet.")}</p> : <div className="evidence-grid">{evidence.map((item, index) => <article key={item.id}>
        {isDisplayable(item.url) ? <img src={item.url} alt={item.description || `${phaseLabel(item.phase, language)} ${t("fotoğrafı", "photo")}`} /> : <span className="image-placeholder"><Camera /></span>}
        <div><b>{phaseLabel(item.phase, language)} · {index + 1}</b><small>{item.description || t("Açıklama yok", "No description")}</small></div>
      </article>)}</div>}
    </section>
  </section>;
}

function isDisplayable(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("https://");
}

async function imageFileToDataUrl(file: File, language: AppLanguage): Promise<string> {
  const source = await readFile(file, language);
  const image = await loadImage(source, language);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error(language === "tr" ? "Fotoğraf tarayıcıda işlenemedi." : "The photo could not be processed in the browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.78;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > 800_000 && quality > 0.42) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > 850_000) throw new Error(language === "tr" ? "Fotoğraf sıkıştırılamadı. Daha küçük bir görsel seçin." : "The photo could not be compressed. Choose a smaller image.");
  return output;
}

function readFile(file: File, language: AppLanguage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(language === "tr" ? "Fotoğraf okunamadı." : "The photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string, language: AppLanguage): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(language === "tr" ? "Fotoğraf açılamadı." : "The photo could not be opened."));
    image.src = url;
  });
}
