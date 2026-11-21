import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
 appId: "com.ecory.consumer.test", appName: "Ecory", webDir: "dist-android",
 plugins: { PushNotifications: { presentationOptions: ["badge", "sound", "alert"] } }
};
export default config;
