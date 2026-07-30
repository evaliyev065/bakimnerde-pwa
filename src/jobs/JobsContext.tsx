import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Job } from "../domain/types";
import { apiRequest, readCachedResponse } from "../lib/api";

const JOBS_LOCAL_KEY = "bakimnerde_pwa_jobs";

interface JobsValue {
  jobs: Job[];
  loading: boolean;
  error: string;
  refresh(): Promise<void>;
  findJob(documentId: string): Job | undefined;
}

const JobsContext = createContext<JobsValue | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const result = await apiRequest<Job[]>("/jobs-list");
      setJobs(result);
      localStorage.setItem(JOBS_LOCAL_KEY, JSON.stringify(result));
    } catch (reason) {
      if (!localStorage.getItem(JOBS_LOCAL_KEY)) setError(reason instanceof Error ? reason.message : "Görevler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const localJobs = JSON.parse(localStorage.getItem(JOBS_LOCAL_KEY) ?? "null") as Job[] | null;
      if (Array.isArray(localJobs)) { setJobs(localJobs); setLoading(false); }
    } catch { localStorage.removeItem(JOBS_LOCAL_KEY); }
    void readCachedResponse<Job[]>("/jobs-list").then((cached) => {
      if (!cached) return;
      setJobs(cached);
      setLoading(false);
      localStorage.setItem(JOBS_LOCAL_KEY, JSON.stringify(cached));
    });
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = useMemo<JobsValue>(() => ({
    jobs,
    loading,
    error,
    refresh,
    findJob: (documentId) => jobs.find((job) => job.documentId === documentId),
  }), [error, jobs, loading, refresh]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): JobsValue {
  const value = useContext(JobsContext);
  if (value === null) throw new Error("JobsProvider bulunamadı.");
  return value;
}
