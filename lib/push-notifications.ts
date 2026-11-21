import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications as Push } from "@capacitor/push-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as SupabaseClient;
let handles: PluginListenerHandle[] = [];
let starting: Promise<void> | undefined;
let registeredAt = 0;
function randomUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function deviceIdentity() {
  try {
    const raw = JSON.parse(localStorage.getItem("ecory-push-device") || "null");
    if (raw && typeof raw.id === "string" && typeof raw.secret === "string")
      return raw as { id: string; secret: string };
  } catch {
    /* Replace malformed old identity safely. */
  }
  const identity = { id: randomUuid(), secret: randomUuid() + randomUuid() };
  localStorage.setItem("ecory-push-device", JSON.stringify(identity));
  return identity;
}
let registrationWaiter: { resolve: () => void; reject: (error: Error) => void } | undefined;
export async function registerPush() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications"))
    throw new Error("এই APK-তে Android push plugin নেই। Firebase-সহ নতুন APK প্রয়োজন।");
  if (starting) return starting;
  starting = (async () => {
    const p = await Push.checkPermissions();
    const granted = p.receive === "granted" ? p : await Push.requestPermissions();
    if (granted.receive === "granted" && Date.now() - registeredAt < 60 * 60 * 1000) return;
    if (granted.receive !== "granted")
      throw new Error("ফোনের Settings থেকে Ecory-এর Notifications অনুমতি দিন।");
    if (!handles.length) {
      handles.push(
        await Push.addListener("registration", async (token) => {
          try {
            const identity = deviceIdentity();
            const { error } = await db.rpc("register_push_device", {
              _id: identity.id,
              _secret: identity.secret,
              _token: token.value,
              _enabled: true,
            });
            if (error)
              throw new Error("ফোন নিবন্ধন হয়নি। সার্ভারের notification SQL পরীক্ষা করুন।");
            localStorage.setItem("ecory-push-enabled", "1");
            registeredAt = Date.now();
            registrationWaiter?.resolve();
          } catch (error) {
            registrationWaiter?.reject(
              error instanceof Error ? error : new Error("ফোন নিবন্ধন হয়নি"),
            );
          }
        }),
      );
      handles.push(
        await Push.addListener("pushNotificationReceived", (data) => {
          toast(data.title || "Ecory", { description: data.body });
        }),
      );
      handles.push(
        await Push.addListener("registrationError", () =>
          registrationWaiter?.reject(
            new Error("Firebase registration ব্যর্থ। APK-এর Firebase setup পরীক্ষা করুন।"),
          ),
        ),
      );
    }
    await Push.createChannel({
      id: "ecory_offers",
      name: "Ecory offers and health tips",
      importance: 4,
      visibility: 1,
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        registrationWaiter = undefined;
        reject(
          new Error(
            "ফোন নিবন্ধনের সময় শেষ হয়েছে। ইন্টারনেট ও Firebase setup পরীক্ষা করে আবার চেষ্টা করুন।",
          ),
        );
      }, 20000);
      registrationWaiter = {
        resolve: () => {
          clearTimeout(timeout);
          registrationWaiter = undefined;
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          registrationWaiter = undefined;
          reject(error);
        },
      };
      void Push.register().catch((error) =>
        registrationWaiter?.reject(
          error instanceof Error ? error : new Error("Push registration failed"),
        ),
      );
    });
  })();
  try {
    await starting;
  } finally {
    starting = undefined;
  }
}

/** First-open permission is independent of Firebase/network success and never blocks rendering. */
let automatic: Promise<void> | undefined;
export async function initializePushOnFirstOpen() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) return;
  if (automatic) return automatic;
  automatic = (async () => {
    const permission = await Push.checkPermissions();
    if (permission.receive !== "granted") {
      if (
        permission.receive === "denied" ||
        localStorage.getItem("ecory-push-permission-asked") === "1"
      )
        return;
      const result = await Push.requestPermissions();
      localStorage.setItem("ecory-push-permission-asked", "1");
      if (result.receive !== "granted") return;
    }
    await registerPush();
  })();
  try {
    await automatic;
  } finally {
    automatic = undefined;
  }
}
