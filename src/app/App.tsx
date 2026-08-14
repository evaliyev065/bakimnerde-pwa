import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useFieldAuth } from "../auth/FieldAuthContext";
import { usePreferences } from "./PreferencesContext";
import { JobsProvider } from "../jobs/JobsContext";
import { MobileShell } from "../layouts/MobileShell";
import { FieldFormPage } from "../pages/FieldFormPage";
import { AdditionalSupplyPage } from "../pages/AdditionalSupplyPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { JobChatPage } from "../pages/JobChatPage";
import { PhotoUploadPage } from "../pages/PhotoUploadPage";
import { ProfilePage } from "../pages/ProfilePage";
import { TaskDetailPage } from "../pages/TaskDetailPage";
import { TasksPage } from "../pages/TasksPage";

export function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route element={<RequireFieldSession />}>
      <Route element={<FieldWorkspace />}>
        <Route path="dashboard" element={<HomePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="task/:taskId" element={<TaskDetailPage />} />
        <Route path="task/:taskId/form" element={<FieldFormPage />} />
        <Route path="task/:taskId/photos" element={<PhotoUploadPage />} />
        <Route path="task/:taskId/additional-supply" element={<AdditionalSupplyPage />} />
        <Route path="task/:taskId/chat" element={<JobChatPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="giris" element={<Navigate to="/login" replace />} />
    <Route path="gorevler" element={<Navigate to="/tasks" replace />} />
    <Route path="profil" element={<Navigate to="/profile" replace />} />
    <Route path="gorev/:taskId" element={<LegacyTaskRedirect />} />
    <Route path="gorev/:taskId/form" element={<LegacyTaskRedirect suffix="form" />} />
    <Route path="gorev/:taskId/fotograflar" element={<LegacyTaskRedirect suffix="photos" />} />
    <Route path="gorev/:taskId/ek-tedarik" element={<LegacyTaskRedirect suffix="additional-supply" />} />
    <Route path="gorev/:taskId/sohbet" element={<LegacyTaskRedirect suffix="chat" />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}

function RequireFieldSession() {
  const { principal, loading } = useFieldAuth();
  const { t } = usePreferences();
  const location = useLocation();
  if (loading) return <div className="app-loading"><LoaderCircle /><b>{t("Saha oturumu doğrulanıyor", "Verifying field session")}</b></div>;
  if (!principal) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}

function FieldWorkspace() {
  return <JobsProvider><MobileShell /></JobsProvider>;
}

function LegacyTaskRedirect({ suffix = "" }: { suffix?: string }) {
  const { taskId } = useParams();
  return <Navigate to={`/task/${taskId}${suffix ? `/${suffix}` : ""}`} replace />;
}
