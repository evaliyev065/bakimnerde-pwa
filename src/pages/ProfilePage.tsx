import { Building2, LogOut, Mail, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { initials } from "../lib/job";
import { usePreferences } from "../app/PreferencesContext";

export function ProfilePage() {
  const { t } = usePreferences();
  const { principal, logout } = useFieldAuth();
  if (!principal) return null;
  return <section className="page-stack">
    <div className="page-heading"><div><p className="kicker">{t("SAHA HESABI", "FIELD ACCOUNT")}</p><h1>{t("Profilim", "My profile")}</h1><span>{t("Bu oturum bu tarayıcıda güvenli olarak saklanır.", "This session is stored securely in this browser.")}</span></div></div>
    <div className="profile-card"><div className="profile-avatar">{initials(principal.name)}</div><h2>{principal.name}</h2><p>{t("Aktif saha personeli", "Active field worker")}</p><span><i /> {t("Çalışmaya hazır", "Ready to work")}</span></div>
    <div className="profile-list">
      <article><UserRound /><div><small>{t("ROL", "ROLE")}</small><b>{t("Saha personeli", "Field worker")}</b></div></article>
      <article><Building2 /><div><small>{t("TAŞERON FİRMA", "CONTRACTOR COMPANY")}</small><b>{principal.tenantName}</b></div></article>
      <article><Mail /><div><small>{t("E-POSTA", "EMAIL")}</small><b>{principal.email}</b></div></article>
      <article><Smartphone /><div><small>{t("ERİŞİM KANALI", "ACCESS CHANNEL")}</small><b>PWA 2.0</b></div></article>
      <article><ShieldCheck /><div><small>{t("OTURUM AYRIMI", "SESSION ISOLATION")}</small><b>{t("Tarayıcı bazlı güvenli oturum", "Secure browser-based session")}</b></div></article>
    </div>
    <button className="logout-button" onClick={logout}><LogOut /> {t("Oturumu kapat", "Sign out")}</button>
  </section>;
}
