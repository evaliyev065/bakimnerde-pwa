import { Bell, ClipboardList, CloudUpload, Home, UserRound, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { requestSystemNotificationPermission, showSystemNotification } from "../notifications/systemNotifications";
import { pendingCount, synchronizeOutbox } from "../offline/sync";
import { Brand } from "../shared/Brand";

const items = [
  { to: "/dashboard", label: "Ana sayfa", icon: Home },
  { to: "/tasks", label: "Görevlerim", icon: ClipboardList },
  { to: "/profile", label: "Profilim", icon: UserRound },
];

interface JobNotification {
  id: string; title: string; body: string; jobId: string; jobNumber: string;
  createdAt: string; readAt: string | null;
}
interface NotificationList { items: JobNotification[]; unreadCount: number }

export function MobileShell() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const knownNotificationIds = useRef<Set<string> | null>(null);
  const navigate = useNavigate();
  const loadNotifications = useCallback(async () => {
    const result = await apiRequest<NotificationList>("/notifications-list");
    setNotifications(result.items);
    setUnreadCount(result.unreadCount);
    if (knownNotificationIds.current === null) {
      knownNotificationIds.current = new Set(result.items.map((item) => item.id));
      return;
    }
    for (const item of result.items.filter((entry) => !entry.readAt)) {
      if (knownNotificationIds.current.has(item.id)) continue;
      knownNotificationIds.current.add(item.id);
      await showSystemNotification(item);
    }
  }, []);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void synchronizeOutbox();
    };
    const updatePending = (event: Event) => setPending(Number((event as CustomEvent<{ pending: number }>).detail?.pending ?? 0));
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("bakimnerde:sync-state", updatePending);
    void pendingCount().then(setPending);
    if (navigator.onLine) void synchronizeOutbox();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("bakimnerde:sync-state", updatePending);
    };
  }, []);
  useEffect(() => {
    void loadNotifications().catch(() => undefined);
    const timer = window.setInterval(() => void loadNotifications().catch(() => undefined), 3_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  async function toggleNotifications() {
    setNotificationsOpen((value) => !value);
    await requestSystemNotificationPermission();
  }

  async function readNotification(item: JobNotification) {
    if (!item.readAt) {
      await apiRequest("/notifications-read", { method: "POST", body: JSON.stringify({ id: item.id }) });
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setNotificationsOpen(false);
    navigate(`/task/${item.jobId}/chat`);
  }

  return <div className="field-shell">
    <header className="field-header">
      <Brand className="field-brand" />
      <div className="field-header__actions">
        <button className={`field-notification ${unreadCount > 0 ? "has-unread" : ""}`} onClick={() => void toggleNotifications()} aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`}><Bell />{unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
        <div className={`connection-chip ${online ? "is-online" : ""}`}>{pending > 0 ? <CloudUpload /> : online ? <Wifi /> : <WifiOff />}{pending > 0 ? `${pending} kayıt bekliyor` : online ? "Canlı" : "Çevrimdışı"}</div>
      </div>
      {notificationsOpen && <section className="field-notification-panel">
        <header><b>İş bildirimleri</b><small>{unreadCount} okunmamış</small></header>
        {notifications.length === 0 && <p>Yeni bildiriminiz yok.</p>}
        {notifications.map((item) => <button className={item.readAt ? "" : "is-unread"} key={item.id} onClick={() => void readNotification(item)}><strong>{item.title}</strong><span>{item.body}</span><time>{new Date(item.createdAt).toLocaleString("tr-TR")}</time></button>)}
      </section>}
    </header>
    <main className="field-main"><Outlet /></main>
    <nav className="bottom-nav" aria-label="Ana menü">{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/dashboard"} className={({ isActive }) => isActive ? "is-active" : ""}><Icon /><span>{label}</span></NavLink>)}</nav>
  </div>;
}
