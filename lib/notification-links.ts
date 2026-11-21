import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
let listening = false;
export function notificationPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const hosts = ["ecory.app", "www.ecory.app", "ecorybd.com", "www.ecorybd.com", "https-ecory-lovable-app.lovable.app"];
      if (url.protocol !== "https:" || url.username || url.password || !hosts.includes(url.hostname)) return null;
      path = url.pathname + url.search + url.hash;
    } catch { return null; }
  }
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u0020]/.test(path)) return null;
  return path;
}
export async function initializeNotificationLinks(navigate: (path: string) => void) {
  if (listening || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) return;
  listening = true;
  try {
    await PushNotifications.addListener("pushNotificationActionPerformed", action => {
      const path = notificationPath(action.notification?.data?.link) || "/";
      navigate(path);
    });
  } catch (error) { listening = false; console.error("Notification link listener failed", error); }
}
