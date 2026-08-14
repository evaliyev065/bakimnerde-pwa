import { ArrowRight, Eye, EyeOff, Languages, Moon, ShieldCheck, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { Brand } from "../shared/Brand";
import { usePreferences } from "../app/PreferencesContext";

export function LoginPage() {
  const { language, theme, t, toggleLanguage, toggleTheme } = usePreferences();
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
      setError(reason instanceof Error ? reason.message : t("Giriş yapılamadı.", "Could not sign in."));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-page">
    <section className="login-story" aria-hidden="true">
      <Brand className="brand-lockup" />
      <div className="story-copy">
        <p>{t("SAHADAKİ SON HALKA", "THE FINAL LINK IN THE FIELD")}</p>
        <h1>{t("Atanan işi görün.", "See your assigned job.")}<br />{t("Kanıtlayın. Tamamlayın.", "Document it. Complete it.")}</h1>
        <span>{t("CPO talebinden Bakımnerde atamasına, taşeron yönetiminden saha müdahalesine kadar tek iş kaydı.", "One job record from the CPO request and Bakımnerde assignment to contractor management and field service.")}</span>
      </div>
      <div className="story-steps">
        <span><i>1</i> {t("Atanmış görev", "Assigned task")}</span><span><i>2</i> {t("Saha formu", "Field form")}</span><span><i>3</i> {t("Fotoğraf kanıtı", "Photo evidence")}</span>
      </div>
    </section>
    <section className="login-panel">
      <div className="login-preferences">
        <button type="button" onClick={toggleLanguage} aria-label={language === "tr" ? "Dili İngilizce yap" : "Switch language to Turkish"}><Languages /><span>{language.toLocaleUpperCase("en-US")}</span></button>
        <button type="button" onClick={toggleTheme} aria-label={theme === "light" ? t("Koyu temaya geç", "Switch to dark theme") : t("Açık temaya geç", "Switch to light theme")}>{theme === "light" ? <Moon /> : <Sun />}</button>
      </div>
      <form className="login-card" onSubmit={submit}>
        <Brand className="mobile-brand" />
        <div className="login-heading">
          <span><ShieldCheck /></span>
          <p>{t("SAHA PERSONELİ GİRİŞİ", "FIELD WORKER SIGN IN")}</p>
          <h2>{t("Vardiyanıza başlayın", "Start your shift")}</h2>
          <small>{t("Yalnız aktif saha personeli hesapları bu alana giriş yapabilir.", "Only active field worker accounts can sign in here.")}</small>
        </div>
        <label><span>{t("E-posta adresi", "Email address")}</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("saha@firma.com", "field@company.com")} /></label>
        <label><span>{t("Parola", "Password")}</span><div className="password-field"><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("Parolayı gizle", "Hide password") : t("Parolayı göster", "Show password")}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-action" disabled={submitting}>{submitting ? t("Kontrol ediliyor…", "Checking…") : t("Saha alanına gir", "Enter field workspace")}<ArrowRight /></button>
        <p className="login-help">{t("Hesabınız taşeron firma yöneticiniz veya Bakımnerde ekibi tarafından oluşturulur.", "Your account is created by your contractor manager or the Bakımnerde team.")}</p>
      </form>
    </section>
  </main>;
}
