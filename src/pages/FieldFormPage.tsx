import { ArrowLeft, CheckCircle2, ClipboardPenLine, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { FieldReport } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";

interface FormState {
  serviceType: string;
  equipmentCondition: string;
  faultCategory: string;
  actionTaken: string;
  safetyResult: string;
  inputVoltage: string;
  outputVoltage: string;
  notes: string;
}

const initialForm: FormState = {
  serviceType: "",
  equipmentCondition: "",
  faultCategory: "",
  actionTaken: "",
  safetyResult: "",
  inputVoltage: "",
  outputVoltage: "",
  notes: "",
};

export function FieldFormPage() {
  const { taskId = "" } = useParams();
  const { findJob } = useJobs();
  const job = findJob(taskId);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskId) return;
    apiRequest<FieldReport | null>("/job-field-report-get", { method: "POST", body: JSON.stringify({ jobId: taskId }) })
      .then((report) => {
        if (!report) return;
        setForm({
          serviceType: report.serviceType,
          equipmentCondition: report.equipmentCondition,
          faultCategory: report.faultCategory,
          actionTaken: report.actionTaken,
          safetyResult: report.safetyResult,
          inputVoltage: report.measurements?.inputVoltage == null ? "" : String(report.measurements.inputVoltage),
          outputVoltage: report.measurements?.outputVoltage == null ? "" : String(report.measurements.outputVoltage),
          notes: report.notes,
        });
        setSaved(report.completed);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Form alınamadı."))
      .finally(() => setLoading(false));
  }, [taskId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await apiRequest("/job-field-report-save", {
        method: "POST",
        body: JSON.stringify({
          jobId: taskId,
          ...form,
          inputVoltage: form.inputVoltage === "" ? null : Number(form.inputVoltage),
          outputVoltage: form.outputVoltage === "" ? null : Number(form.outputVoltage),
        }),
      });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Form kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (!job && !loading) return <div className="empty-card"><h2>Görev bulunamadı</h2><Link to="/tasks">Görevlerime dön</Link></div>;

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> İş detayına dön</Link>
    <div className="subpage-heading"><span><ClipboardPenLine /></span><div><p className="kicker">{job?.id ?? "SAHA FORMU"}</p><h1>Saha işlem formu</h1><p>Seçimler standart rapora dönüşür; açıklama işi teknik olarak tamamlar.</p></div></div>
    {loading ? <div className="loading-card">Form yükleniyor…</div> : <form className="field-form card-section" onSubmit={submit}>
      <SelectField label="Hizmet türü" value={form.serviceType} set={(serviceType) => setForm({ ...form, serviceType })} options={[
        ["PREVENTIVE_MAINTENANCE", "Periyodik bakım"], ["FAULT_REPAIR", "Arıza müdahalesi"], ["INSTALLATION_CHECK", "Kurulum kontrolü"],
      ]} />
      <SelectField label="Bakım yapılan varlığın son durumu" value={form.equipmentCondition} set={(equipmentCondition) => setForm({ ...form, equipmentCondition })} options={[
        ["OPERATIONAL", "Çalışır durumda"], ["LIMITED", "Kısıtlı çalışıyor"], ["OUT_OF_SERVICE", "Hizmet dışı"],
      ]} />
      <SelectField label="Arıza kategorisi" value={form.faultCategory} set={(faultCategory) => setForm({ ...form, faultCategory })} options={[
        ["ELECTRICAL", "Elektrik"], ["MECHANICAL", "Mekanik"], ["COMMUNICATION", "İletişim"], ["SOFTWARE", "Yazılım"], ["OTHER", "Diğer"],
      ]} />
      <SelectField label="Uygulanan işlem" value={form.actionTaken} set={(actionTaken) => setForm({ ...form, actionTaken })} options={[
        ["REPAIRED", "Yerinde onarıldı"], ["PART_REQUIRED", "Parça gerekiyor"], ["MONITORING", "Takibe alındı"], ["NO_FAULT", "Arıza görülmedi"],
      ]} />
      <SelectField label="Güvenlik sonucu" value={form.safetyResult} set={(safetyResult) => setForm({ ...form, safetyResult })} options={[
        ["SAFE", "Alan güvenli"], ["ISOLATED", "Enerji izole edildi"], ["ESCALATED", "Güvenlik eskalasyonu açıldı"],
      ]} />
      <div className="measurement-grid">
        <label><span>Giriş voltajı (V)</span><input inputMode="decimal" min="0" max="1000" step="0.1" type="number" value={form.inputVoltage} onChange={(event) => setForm({ ...form, inputVoltage: event.target.value })} placeholder="Örn. 400" /></label>
        <label><span>Çıkış voltajı (V)</span><input inputMode="decimal" min="0" max="1000" step="0.1" type="number" value={form.outputVoltage} onChange={(event) => setForm({ ...form, outputVoltage: event.target.value })} placeholder="Örn. 398" /></label>
      </div>
      <label><span>Teknik açıklama</span><textarea required minLength={10} maxLength={2000} rows={6} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Tespit edilen durum, uygulanan işlem ve test sonucunu yazın." /><small>{form.notes.length}/2000</small></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      {saved && <div className="saved-banner"><CheckCircle2 /> Form iş çevrimine kaydedildi.</div>}
      <button className="primary-action" disabled={saving}><Save /> {saving ? "Kaydediliyor…" : "Formu kaydet"}</button>
    </form>}
  </section>;
}

function SelectField({ label, value, set, options }: { label: string; value: string; set(value: string): void; options: Array<[string, string]> }) {
  return <label><span>{label}</span><select required value={value} onChange={(event) => set(event.target.value)}><option value="">Seçin</option>{options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>;
}
