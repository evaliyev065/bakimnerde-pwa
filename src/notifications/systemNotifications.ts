export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  return (Notification.permission === "granted" ? "granted" : await Notification.requestPermission()) === "granted";
}

export async function showSystemNotification(item: { id: string; title: string; body: string; jobId: string }): Promise<void> {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(item.title, { body: item.body, tag: item.id });
  }
}
