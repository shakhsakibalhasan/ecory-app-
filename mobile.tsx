import { parentPage } from "./lib/page-parent";
import { handleAppBack } from "./lib/app-back";
import { useEffect, type ReactNode } from "react";
import { initializePushOnFirstOpen } from "./lib/push-notifications";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { initializeNotificationLinks } from "./lib/notification-links";
import { getRouter } from "./router";
import "./styles.css";
// The native WebView already owns its document shell. Do not render a
// second html/body tree inside #root when route metadata changes.
import { Route as RootRoute } from "./routes/__root";
Object.assign(RootRoute.options, {
  shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
});
const router = getRouter();
void initializeNotificationLinks((path) => {
  void router
    .navigate({ to: path })
    .catch((error) => console.error("Notification navigation failed", error));
});
function openAppLink(raw: string) {
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.hostname !== "ecory.app" ||
      !/^\/(track|doctor-booking\/[^/]+|doctor-bookings|offers|product\/[^/]+)\/?$/.test(u.pathname)
    )
      return;
    void router.navigate({ to: u.pathname + u.search });
  } catch {}
}
if (Capacitor.isNativePlatform()) {
  void App.addListener("appUrlOpen", ({ url }) => openAppLink(url));
  void App.getLaunchUrl().then((value) => {
    if (value?.url) openAppLink(value.url);
  });
  void App.addListener("backButton", ({ canGoBack }) => {
    if (handleAppBack()) return;
    const { pathname, searchStr } = router.state.location;
    const parent = parentPage(pathname, searchStr);
    if (parent && parent !== pathname) void router.navigate({ to: parent, replace: true });
    else void App.exitApp();
  });
}
function MobileApp() {
  useEffect(() => {
    const attempt = () =>
      void initializePushOnFirstOpen().catch((error) =>
        console.warn("Push registration pending; use the notification bell to retry", error),
      );
    const timer = setTimeout(attempt, 1000);
    window.addEventListener("online", attempt);
    let active = true;
    let dispose: (() => void) | undefined;
    if (Capacitor.isNativePlatform())
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) attempt();
      }).then((handle) => {
        if (active) dispose = () => void handle.remove();
        else void handle.remove();
      });
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("online", attempt);
      dispose?.();
    };
  }, []);
  return <RouterProvider router={router} />;
}
createRoot(document.getElementById("root")!).render(<MobileApp />);
