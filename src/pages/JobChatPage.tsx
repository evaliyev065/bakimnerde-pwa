import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useJobs } from "../jobs/JobsContext";
import { apiRequest } from "../lib/api";
import { usePreferences } from "../app/PreferencesContext";

interface JobMessage {
  id: string;
  text: string;
  senderName: string;
  senderTenantName: string;
  createdAt: string;
  mine: boolean;
  pendingSync?: boolean;
}

export function JobChatPage() {
  const { locale, t } = usePreferences();
  const { taskId = "" } = useParams();
  const { findJob } = useJobs();
  const job = findJob(taskId);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setMessages(await apiRequest<JobMessage[]>("/job-messages-list", { method: "POST", body: JSON.stringify({ jobId: taskId }) }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Mesajlar alınamadı.", "Messages could not be loaded.")); }
  }, [t, taskId]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (navigator.onLine) void load(); }, 3_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true); setError("");
    try {
      await apiRequest("/job-messages-send", { method: "POST", body: JSON.stringify({ jobId: taskId, text: text.trim() }) });
      setText(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Mesaj gönderilemedi.", "Message could not be sent.")); }
    finally { setSending(false); }
  }

  return <section className="page-stack subpage">
    <Link to={`/task/${taskId}`} className="back"><ArrowLeft /> {t("İş detayına dön", "Back to job details")}</Link>
    <div className="subpage-heading"><span><MessageSquare /></span><div><p className="kicker">{job?.id ?? t("İŞ SOHBETİ", "JOB CHAT")}</p><h1>{t("İş sohbeti", "Job chat")}</h1><p>{t("Kendi yönetiminiz ve Bakımnerde operasyon ekibiyle bu bakım kaydı üzerinden iletişim kurun.", "Use this maintenance record to communicate with your management and the Bakımnerde operations team.")}</p></div></div>
    <section className="field-chat card-section">
      <div className="field-chat__feed">{messages.length === 0 && <p className="gallery-empty">{t("Henüz mesaj yok.", "No messages yet.")}</p>}{messages.map((message) => <article className={message.mine ? "mine" : ""} key={message.id}><b>{message.senderName} · {message.senderTenantName}</b><p>{message.text}</p><small>{message.pendingSync ? t("Çevrimdışı · gönderim bekliyor", "Offline · waiting to send") : new Date(message.createdAt).toLocaleString(locale)}</small></article>)}</div>
      {error && <div className="form-error">{error}</div>}
      <form className="field-chat__form" onSubmit={send}><textarea maxLength={2000} rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={t("Yönetiminize veya Bakımnerde'ye mesaj yazın", "Write a message to your management or Bakımnerde")} /><button className="primary-action" disabled={sending || !text.trim()}><Send /> {sending ? t("Gönderiliyor…", "Sending…") : t("Mesajı gönder", "Send message")}</button></form>
    </section>
  </section>;
}
