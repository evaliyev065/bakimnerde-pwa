import { ArrowLeft, CheckCircle2, PackageCheck, PackagePlus, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";
import { usePreferences } from "../app/PreferencesContext";

interface SupplyRequest {
  id: string;
  type: string;
  description: string;
  partSupplyStatus: string;
  supplyDeadlineAt?: string;
  pendingSync?: boolean;
  confirmationPendingSync?: boolean;
}
const supplyStatusLabels: Record<string, [string, string]> = {
  PENDING_PRICING: ["Bakımnerde fiyatlandırması bekleniyor", "Awaiting Bakımnerde pricing"],
  AWAITING_CPO_DEADLINE: ["CPO kesin tedarik tarihi bekleniyor", "Awaiting final supply date from CPO"],
  SUPPLY_IN_PROGRESS: ["Ek tedarik sürecinde", "Additional supply in progress"],
  DELAYED: ["Tedarik gecikti", "Supply delayed"],
  AWAITING_FIELD_CONFIRMATION: ["Saha teslim doğrulaması bekleniyor", "Awaiting field delivery confirmation"],
  SUPPLIED: ["Temin edildi", "Supplied"],
};
const supplyTypes = [
  ["FAN_REPLACEMENT", "Fan değişimi", "Fan replacement"],
  ["CABLE_REPLACEMENT", "Kablo değişimi", "Cable replacement"],
  ["CONNECTOR_REPLACEMENT", "Konnektör değişimi", "Connector replacement"],
  ["OTHER_SUPPLY", "Diğer ek tedarik", "Other additional supply"],
] as const;

export function AdditionalSupplyPage() {
  const { language, locale, t } = usePreferences();
  const languageIndex = language === "tr" ? 1 : 2;
  const { taskId = "" } = useParams();
  const { findJob } = useJobs();
  const job = findJob(taskId);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setRequests(await apiRequest<SupplyRequest[]>("/additional-requests-list", { method: "POST", body: JSON.stringify({ jobId: taskId }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("Ek tedarik talepleri alınamadı.", "Additional supply requests could not be loaded.")); }
  }, [t, taskId]);
  useEffect(() => {
    void load();
    const refreshAfterSync = () => { if (navigator.onLine) void load(); };
    window.addEventListener("bakimnerde:sync-state", refreshAfterSync);
    return () => window.removeEventListener("bakimnerde:sync-state", refreshAfterSync);
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest("/additional-requests-create", { method: "POST", body: JSON.stringify({ jobId: taskId, type, description }) });
      setType(""); setDescription(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Ek tedarik kaydedilemedi.", "Additional supply request could not be saved.")); }
    finally { setSaving(false); }
  }

  async function confirmPhysicalDelivery(request: SupplyRequest) {
    if (request.partSupplyStatus !== "AWAITING_FIELD_CONFIRMATION" || confirmingId) return;
    setConfirmingId(request.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ queued?: boolean }>("/additional-requests-field-confirm", {
        method: "POST",
        body: JSON.stringify({ id: request.id, jobId: taskId }),
      });
      setRequests((current) => current.map((item) => item.id === request.id ? {
        ...item,
        partSupplyStatus: "SUPPLIED",
        confirmationPendingSync: Boolean(result.queued),
      } : item));
      setNotice(result.queued
        ? t("Fiziksel teslim doğrulaması çevrimdışı kuyruğa alındı; bağlantı kurulunca gönderilecek.", "Physical delivery confirmation was queued offline and will be sent when a connection is available.")
        : t("Fiziksel teslim doğrulandı.", "Physical delivery confirmed."));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Fiziksel teslim doğrulanamadı.", "Physical delivery could not be confirmed."));
    } finally {
      setConfirmingId("");
    }
  }

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> {t("İş detayına dön", "Back to job details")}</Link>
    <div className="subpage-heading"><span><PackagePlus /></span><div><p className="kicker">{job?.id ?? t("EK TEDARİK", "ADDITIONAL SUPPLY")}</p><h1>{t("Ek tedarik gerekli", "Additional supply required")}</h1><p>{t("Yalnız gereken işlemi seçip kısa açıklama yazın. Fiyatlandırma sadece Bakımnerde yönetiminde yapılır.", "Select only the required service and add a short description. Pricing is handled only by Bakımnerde management.")}</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="success-banner" role="status"><CheckCircle2 /><div><b>{t("Teslim durumu güncellendi", "Delivery status updated")}</b><span>{notice}</span></div></div>}
    <form className="field-form card-section" onSubmit={submit}><label><span>{t("Gerekli ek işlem", "Required additional service")}</span><select required value={type} onChange={(event) => setType(event.target.value)}><option value="">{t("Seçin", "Select")}</option>{supplyTypes.map(([value, turkish, english]) => <option value={value} key={value}>{language === "tr" ? turkish : english}</option>)}</select></label><label><span>{t("Saha açıklaması", "Field description")}</span><textarea required minLength={5} maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("Gereken parça veya işlemi kısaca açıklayın.", "Briefly describe the required part or service.")} /></label><button className="primary-action" disabled={saving || !type || !description.trim()}><Send /> {saving ? t("Kaydediliyor…", "Saving…") : t("Ek tedarik gereksinimini kaydet", "Save additional supply requirement")}</button></form>
    <section className="gallery-section"><div><h2>{t("Bu işin ek tedarikleri", "Additional supplies for this job")}</h2><span>{requests.length}</span></div>{requests.length === 0 ? <p className="gallery-empty">{t("Ek tedarik gereksinimi yok.", "No additional supply requirement.")}</p> : <div className="supply-list">{requests.map((request) => <article key={request.id}><b>{supplyTypes.find(([value]) => value === request.type)?.[languageIndex] ?? request.type}</b><span>{request.description}</span><small>{request.pendingSync ? t("Bakımnerde'ye gönderim bekliyor", "Waiting to send to Bakımnerde") : request.confirmationPendingSync ? t("Teslim doğrulaması gönderim bekliyor", "Delivery confirmation is waiting to send") : supplyStatusLabels[request.partSupplyStatus]?.[language === "tr" ? 0 : 1] ?? request.partSupplyStatus}</small>{request.supplyDeadlineAt && <small>{t("Kesin tarih", "Final date")}: {new Date(request.supplyDeadlineAt).toLocaleString(locale)}</small>}{request.partSupplyStatus === "AWAITING_FIELD_CONFIRMATION" && <div className="supply-confirm"><p>{t("Parça fiziksel olarak size ulaştıysa teslimi doğrulayın. Bu onay ek tedarik sürecini tamamlar.", "Confirm delivery if the part has physically reached you. This confirmation completes the additional supply process.")}</p><button type="button" disabled={Boolean(confirmingId)} onClick={() => void confirmPhysicalDelivery(request)}><PackageCheck /> {confirmingId === request.id ? t("Doğrulanıyor…", "Confirming…") : t("Fiziksel teslimi doğrula", "Confirm physical delivery")}</button></div>}</article>)}</div>}</section>
  </section>;
}
