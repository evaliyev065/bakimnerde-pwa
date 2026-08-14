import { ArrowLeft, CheckCircle2, ClipboardPenLine, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { FieldReport } from "../domain/types";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";
import { usePreferences } from "../app/PreferencesContext";

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
  const { t } = usePreferences();
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
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("Form alınamadı.", "Form could not be loaded.")))
      .finally(() => setLoading(false));
  }, [t, taskId]);

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
      setError(reason instanceof Error ? reason.message : t("Form kaydedilemedi.", "Form could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  if (!job && !loading) return <div className="empty-card"><h2>{t("Görev bulunamadı", "Task not found")}</h2><Link to="/tasks">{t("Görevlerime dön", "Back to my tasks")}</Link></div>;

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> {t("İş detayına dön", "Back to job details")}</Link>
    <div className="subpage-heading"><span><ClipboardPenLine /></span><div><p className="kicker">{job?.id ?? t("SAHA FORMU", "FIELD FORM")}</p><h1>{t("Saha işlem formu", "Field service form")}</h1><p>{t("Seçimler standart rapora dönüşür; açıklama işi teknik olarak tamamlar.", "Selections become a standard report; your notes complete the technical record.")}</p></div></div>
    {loading ? <div className="loading-card">{t("Form yükleniyor…", "Loading form…")}</div> : <form className="field-form card-section" onSubmit={submit}>
      <SelectField label={t("Hizmet türü", "Service type")} value={form.serviceType} set={(serviceType) => setForm({ ...form, serviceType })} options={[
        ["PREVENTIVE_MAINTENANCE", t("Periyodik bakım", "Preventive maintenance")], ["FAULT_REPAIR", t("Arıza müdahalesi", "Fault repair")], ["INSTALLATION_CHECK", t("Kurulum kontrolü", "Installation check")],
      ]} />
      <SelectField label={t("Bakım yapılan varlığın son durumu", "Final condition of maintained asset")} value={form.equipmentCondition} set={(equipmentCondition) => setForm({ ...form, equipmentCondition })} options={[
        ["OPERATIONAL", t("Çalışır durumda", "Operational")], ["LIMITED", t("Kısıtlı çalışıyor", "Limited operation")], ["OUT_OF_SERVICE", t("Hizmet dışı", "Out of service")],
      ]} />
      <SelectField label={t("Arıza kategorisi", "Fault category")} value={form.faultCategory} set={(faultCategory) => setForm({ ...form, faultCategory })} options={[
        ["ELECTRICAL", t("Elektrik", "Electrical")], ["MECHANICAL", t("Mekanik", "Mechanical")], ["COMMUNICATION", t("İletişim", "Communication")], ["SOFTWARE", t("Yazılım", "Software")], ["OTHER", t("Diğer", "Other")],
      ]} />
      <SelectField label={t("Uygulanan işlem", "Action taken")} value={form.actionTaken} set={(actionTaken) => setForm({ ...form, actionTaken })} options={[
        ["REPAIRED", t("Yerinde onarıldı", "Repaired on site")], ["PART_REQUIRED", t("Parça gerekiyor", "Part required")], ["MONITORING", t("Takibe alındı", "Monitoring")], ["NO_FAULT", t("Arıza görülmedi", "No fault found")],
      ]} />
      <SelectField label={t("Güvenlik sonucu", "Safety result")} value={form.safetyResult} set={(safetyResult) => setForm({ ...form, safetyResult })} options={[
        ["SAFE", t("Alan güvenli", "Area safe")], ["ISOLATED", t("Enerji izole edildi", "Energy isolated")], ["ESCALATED", t("Güvenlik eskalasyonu açıldı", "Safety escalation opened")],
      ]} />
      <div className="measurement-grid">
        <label><span>{t("Giriş voltajı (V)", "Input voltage (V)")}</span><input inputMode="decimal" min="0" max="1000" step="0.1" type="number" value={form.inputVoltage} onChange={(event) => setForm({ ...form, inputVoltage: event.target.value })} placeholder={t("Örn. 400", "E.g. 400")} /></label>
        <label><span>{t("Çıkış voltajı (V)", "Output voltage (V)")}</span><input inputMode="decimal" min="0" max="1000" step="0.1" type="number" value={form.outputVoltage} onChange={(event) => setForm({ ...form, outputVoltage: event.target.value })} placeholder={t("Örn. 398", "E.g. 398")} /></label>
      </div>
      <label><span>{t("Teknik açıklama", "Technical notes")}</span><textarea required minLength={10} maxLength={2000} rows={6} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t("Tespit edilen durum, uygulanan işlem ve test sonucunu yazın.", "Describe the finding, action taken, and test result.")} /><small>{form.notes.length}/2000</small></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      {saved && <div className="saved-banner"><CheckCircle2 /> {t("Form iş çevrimine kaydedildi.", "Form saved to the job cycle.")}</div>}
      <button className="primary-action" disabled={saving}><Save /> {saving ? t("Kaydediliyor…", "Saving…") : t("Formu kaydet", "Save form")}</button>
    </form>}
  </section>;
}

function SelectField({ label, value, set, options }: { label: string; value: string; set(value: string): void; options: Array<[string, string]> }) {
  const { t } = usePreferences();
  return <label><span>{label}</span><select required value={value} onChange={(event) => set(event.target.value)}><option value="">{t("Seçin", "Select")}</option>{options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>;
}
