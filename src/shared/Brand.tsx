import { Zap } from "lucide-react";
import { usePreferences } from "../app/PreferencesContext";

export function Brand({ className = "" }: { className?: string }) {
  const { t } = usePreferences();
  return <div className={className} aria-label={t("Bakımnerde Saha", "Bakımnerde Field")}>
    <span><Zap fill="currentColor" aria-hidden="true" /></span>
    <strong>bakımnerde</strong>
    <small>{t("SAHA", "FIELD")}</small>
  </div>;
}
