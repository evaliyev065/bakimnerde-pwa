import { Zap } from "lucide-react";

export function Brand({ className = "" }: { className?: string }) {
  return <div className={className} aria-label="Bakımnerde Saha">
    <span><Zap fill="currentColor" aria-hidden="true" /></span>
    <strong>bakımnerde</strong>
    <small>SAHA</small>
  </div>;
}
