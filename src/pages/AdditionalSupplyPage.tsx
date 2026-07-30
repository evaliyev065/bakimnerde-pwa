import { ArrowLeft, PackagePlus, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";

interface SupplyRequest { id: string; type: string; description: string; partSupplyStatus: string; supplyDeadlineAt?: string; pendingSync?: boolean }
const supplyStatusLabels: Record<string, string> = {
  PENDING_PRICING: "Bakımnerde fiyatlandırması bekleniyor",
  AWAITING_CPO_DEADLINE: "CPO kesin tedarik tarihi bekleniyor",
  SUPPLY_IN_PROGRESS: "Ek tedarik sürecinde",
  DELAYED: "Tedarik gecikti",
  SUPPLIED: "Temin edildi",
};
const supplyTypes = [
  ["FAN_REPLACEMENT", "Fan değişimi"],
  ["CABLE_REPLACEMENT", "Kablo değişimi"],
  ["CONNECTOR_REPLACEMENT", "Konnektör değişimi"],
  ["OTHER_SUPPLY", "Diğer ek tedarik"],
] as const;

export function AdditionalSupplyPage() {
  const { taskId = "" } = useParams();
  const { findJob } = useJobs();
  const job = findJob(taskId);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setRequests(await apiRequest<SupplyRequest[]>("/additional-requests-list", { method: "POST", body: JSON.stringify({ jobId: taskId }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Ek tedarik talepleri alınamadı."); }
  }, [taskId]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await apiRequest("/additional-requests-create", { method: "POST", body: JSON.stringify({ jobId: taskId, type, description }) });
      setType(""); setDescription(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ek tedarik kaydedilemedi."); }
    finally { setSaving(false); }
  }

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> İş detayına dön</Link>
    <div className="subpage-heading"><span><PackagePlus /></span><div><p className="kicker">{job?.id ?? "EK TEDARİK"}</p><h1>Ek tedarik gerekli</h1><p>Yalnız gereken işlemi seçip kısa açıklama yazın. Fiyatlandırma sadece Bakımnerde yönetiminde yapılır.</p></div></div>
    <form className="field-form card-section" onSubmit={submit}><label><span>Gerekli ek işlem</span><select required value={type} onChange={(event) => setType(event.target.value)}><option value="">Seçin</option>{supplyTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>Saha açıklaması</span><textarea required minLength={5} maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Gereken parça veya işlemi kısaca açıklayın." /></label>{error && <div className="form-error">{error}</div>}<button className="primary-action" disabled={saving || !type || !description.trim()}><Send /> {saving ? "Kaydediliyor…" : "Ek tedarik gereksinimini kaydet"}</button></form>
    <section className="gallery-section"><div><h2>Bu işin ek tedarikleri</h2><span>{requests.length}</span></div>{requests.length === 0 ? <p className="gallery-empty">Ek tedarik gereksinimi yok.</p> : <div className="supply-list">{requests.map((request) => <article key={request.id}><b>{supplyTypes.find(([value]) => value === request.type)?.[1] ?? request.type}</b><span>{request.description}</span><small>{request.pendingSync ? "Bakımnerde'ye gönderim bekliyor" : supplyStatusLabels[request.partSupplyStatus] ?? request.partSupplyStatus}</small>{request.supplyDeadlineAt && <small>Kesin tarih: {new Date(request.supplyDeadlineAt).toLocaleString("tr-TR")}</small>}</article>)}</div>}</section>
  </section>;
}
