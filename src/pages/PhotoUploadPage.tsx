import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Info, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Evidence, EvidencePhase } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";

const phaseDetails: Record<EvidencePhase, { label: string; target: number; description: string }> = {
  BEFORE: { label: "Bakım öncesi", target: 6, description: "Bakım hedefinin müdahale öncesi farklı açıları" },
  AFTER: { label: "Bakım sonrası", target: 6, description: "Tamamlanan iş ve test sonucu" },
  BRANDED: { label: "Bakımnerde markalı", target: 1, description: "Saha personeli ve bakım yapılan varlık" },
};

export function PhotoUploadPage() {
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
      setError(reason instanceof Error ? reason.message : "Fotoğraflar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries((Object.keys(phaseDetails) as EvidencePhase[]).map((key) => [
    key, evidence.filter((item) => item.phase === key).length,
  ])) as Record<EvidencePhase, number>, [evidence]);
  const remaining = phaseDetails[phase].target - counts[phase];

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some((file) => file.size > 12 * 1024 * 1024)) {
      setError("Her fotoğraf en fazla 12 MB olabilir.");
      event.target.value = "";
      return;
    }
    setError("");
    setFiles(selected.slice(0, Math.max(remaining, 0)));
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0 || remaining <= 0) return;
    setUploading(true);
    setError("");
    try {
      for (const [index, file] of files.entries()) {
        const dataUrl = await imageFileToDataUrl(file);
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
            description: description.trim() || `${phaseDetails[phase].label} ${counts[phase] + index + 1}`,
          }),
        });
      }
      setFiles([]);
      setDescription("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  if (!job && !loading) return <div className="empty-card"><h2>Görev bulunamadı</h2><Link to="/tasks">Görevlerime dön</Link></div>;

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> İş detayına dön</Link>
    <div className="subpage-heading"><span><Camera /></span><div><p className="kicker">{job?.id ?? "SAHA KANITI"}</p><h1>Fotoğraf yükleme</h1><p>Her fotoğraf ilgili işin güncel çevrimine kanıt olarak kaydedilir.</p></div></div>
    <div className="photo-progress">{(Object.keys(phaseDetails) as EvidencePhase[]).map((key) => <button type="button" className={`${phase === key ? "is-active" : ""} ${counts[key] === phaseDetails[key].target ? "is-complete" : ""}`} onClick={() => { setPhase(key); setFiles([]); }} key={key}><span>{counts[key] === phaseDetails[key].target ? <CheckCircle2 /> : <Camera />}</span><b>{phaseDetails[key].label}</b><small>{counts[key]}/{phaseDetails[key].target}</small></button>)}</div>
    {loading ? <div className="loading-card">Fotoğraflar yükleniyor…</div> : <form className="upload-card" onSubmit={upload}>
      <div className="upload-heading"><div><p className="kicker">{phaseDetails[phase].label}</p><h2>{phaseDetails[phase].description}</h2></div><b>{remaining > 0 ? `${remaining} eksik` : "Tamam"}</b></div>
      {remaining > 0 ? <>
        <label className="file-drop"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={selectFiles} /><span><ImagePlus /></span><b>{files.length > 0 ? `${files.length} fotoğraf seçildi` : "Fotoğraf seç veya kamerayı aç"}</b><small>JPG, PNG veya WebP · dosya başına en fazla 12 MB</small></label>
        <label><span>Fotoğraf açıklaması</span><input maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Örn. Sağ bağlantı terminali" /></label>
        <div className="info-bar"><Info /> Fotoğraflar tarayıcıda sıkıştırılarak yüklenir; seçilen aşama sonradan değiştirilemez.</div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-action" disabled={uploading || files.length === 0}><Upload /> {uploading ? "Fotoğraflar yükleniyor…" : `${files.length || ""} fotoğrafı yükle`}</button>
      </> : <div className="phase-complete"><CheckCircle2 /><div><b>Bu aşama tamamlandı</b><span>Yeni yükleme için diğer fotoğraf aşamasını seçin.</span></div></div>}
    </form>}
    <section className="gallery-section">
      <div><h2>Yüklenen kanıtlar</h2><span>{evidence.length}/13</span></div>
      {evidence.length === 0 ? <p className="gallery-empty">Henüz fotoğraf yüklenmedi.</p> : <div className="evidence-grid">{evidence.map((item, index) => <article key={item.id}>
        {isDisplayable(item.url) ? <img src={item.url} alt={item.description || `${phaseDetails[item.phase].label} fotoğrafı`} /> : <span className="image-placeholder"><Camera /></span>}
        <div><b>{phaseDetails[item.phase].label} · {index + 1}</b><small>{item.description || "Açıklama yok"}</small></div>
      </article>)}</div>}
    </section>
  </section>;
}

function isDisplayable(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("https://");
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const source = await readFile(file);
  const image = await loadImage(source);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf tarayıcıda işlenemedi.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.78;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > 800_000 && quality > 0.42) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > 850_000) throw new Error("Fotoğraf sıkıştırılamadı. Daha küçük bir görsel seçin.");
  return output;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Fotoğraf açılamadı."));
    image.src = url;
  });
}
