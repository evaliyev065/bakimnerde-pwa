import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Principal } from "../domain/types";
import { apiRequest, FIELD_TOKEN_KEY } from "../lib/api";

interface FieldAuthValue {
  principal: Principal | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const FIELD_PRINCIPAL_KEY = "bakimnerde_pwa_principal";

const FieldAuthContext = createContext<FieldAuthValue | null>(null);

export function FieldAuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(FIELD_TOKEN_KEY) ?? sessionStorage.getItem(FIELD_TOKEN_KEY)));

  useEffect(() => {
    if (!(localStorage.getItem(FIELD_TOKEN_KEY) ?? sessionStorage.getItem(FIELD_TOKEN_KEY))) return;
    let cachedPrincipal: Principal | null = null;
    try {
      cachedPrincipal = JSON.parse(localStorage.getItem(FIELD_PRINCIPAL_KEY) ?? "null") as Principal | null;
      if (cachedPrincipal?.role === "FIELD_WORKER") setPrincipal(cachedPrincipal);
    } catch { localStorage.removeItem(FIELD_PRINCIPAL_KEY); }
    apiRequest<Principal>("/auth-me")
      .then((value) => {
        if (value.role !== "FIELD_WORKER") throw new Error("Bu hesap saha uygulamasını kullanamaz.");
        setPrincipal(value);
        localStorage.setItem(FIELD_PRINCIPAL_KEY, JSON.stringify(value));
      })
      .catch((reason: unknown) => {
        const status = (reason as { status?: number } | null)?.status;
        if (!cachedPrincipal || status === 401 || status === 403) {
          localStorage.removeItem(FIELD_TOKEN_KEY);
          sessionStorage.removeItem(FIELD_TOKEN_KEY);
          localStorage.removeItem(FIELD_PRINCIPAL_KEY);
          setPrincipal(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<FieldAuthValue>(() => ({
    principal,
    loading,
    async login(email, password) {
      const result = await apiRequest<{ token: string; principal: Principal }>("/auth-field-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(FIELD_TOKEN_KEY, result.token);
      localStorage.setItem(FIELD_PRINCIPAL_KEY, JSON.stringify(result.principal));
      setPrincipal(result.principal);
    },
    logout() {
      localStorage.removeItem(FIELD_TOKEN_KEY);
      sessionStorage.removeItem(FIELD_TOKEN_KEY);
      localStorage.removeItem(FIELD_PRINCIPAL_KEY);
      setPrincipal(null);
    },
  }), [loading, principal]);

  return <FieldAuthContext.Provider value={value}>{children}</FieldAuthContext.Provider>;
}

export function useFieldAuth(): FieldAuthValue {
  const value = useContext(FieldAuthContext);
  if (value === null) throw new Error("FieldAuthProvider bulunamadı.");
  return value;
}
