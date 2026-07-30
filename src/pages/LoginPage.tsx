import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { Brand } from "../shared/Brand";

export function LoginPage() {
  const { principal, login } = useFieldAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (principal) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(destination, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Giriş yapılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-page">
    <section className="login-story" aria-hidden="true">
      <Brand className="brand-lockup" />
      <div className="story-copy">
        <p>SAHADAKİ SON HALKA</p>
        <h1>Atanan işi görün.<br />Kanıtlayın. Tamamlayın.</h1>
        <span>CPO talebinden Bakımnerde atamasına, taşeron yönetiminden saha müdahalesine kadar tek iş kaydı.</span>
      </div>
      <div className="story-steps">
        <span><i>1</i> Atanmış görev</span><span><i>2</i> Saha formu</span><span><i>3</i> Fotoğraf kanıtı</span>
      </div>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <Brand className="mobile-brand" />
        <div className="login-heading">
          <span><ShieldCheck /></span>
          <p>SAHA PERSONELİ GİRİŞİ</p>
          <h2>Vardiyanıza başlayın</h2>
          <small>Yalnız aktif saha personeli hesapları bu alana giriş yapabilir.</small>
        </div>
        <label><span>E-posta adresi</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="saha@firma.com" /></label>
        <label><span>Parola</span><div className="password-field"><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-action" disabled={submitting}>{submitting ? "Kontrol ediliyor…" : "Saha alanına gir"}<ArrowRight /></button>
        <p className="login-help">Hesabınız taşeron firma yöneticiniz veya Bakımnerde ekibi tarafından oluşturulur.</p>
      </form>
    </section>
  </main>;
}
