import { Building2, LogOut, Mail, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { initials } from "../lib/job";

export function ProfilePage() {
  const { principal, logout } = useFieldAuth();
  if (!principal) return null;
  return <section className="page-stack">
    <div className="page-heading"><div><p className="kicker">SAHA HESABI</p><h1>Profilim</h1><span>Bu oturum bu tarayıcıda güvenli olarak saklanır.</span></div></div>
    <div className="profile-card"><div className="profile-avatar">{initials(principal.name)}</div><h2>{principal.name}</h2><p>Aktif saha personeli</p><span><i /> Çalışmaya hazır</span></div>
    <div className="profile-list">
      <article><UserRound /><div><small>ROL</small><b>Saha personeli</b></div></article>
      <article><Building2 /><div><small>TAŞERON FİRMA</small><b>{principal.tenantName}</b></div></article>
      <article><Mail /><div><small>E-POSTA</small><b>{principal.email}</b></div></article>
      <article><Smartphone /><div><small>ERİŞİM KANALI</small><b>PWA 2.0</b></div></article>
      <article><ShieldCheck /><div><small>OTURUM AYRIMI</small><b>Tarayıcı bazlı güvenli oturum</b></div></article>
    </div>
    <button className="logout-button" onClick={logout}><LogOut /> Oturumu kapat</button>
  </section>;
}
