import { uiClient } from "@/lib/presentation";
import { useQuery } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
export function AdminCustomerSms() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["customer-sms-settings"],
    queryFn: async () => {
      const r = await uiClient
        .from("customer_communication_settings")
        .select("sms_enabled")
        .eq("id", 1)
        .single();
      if (r.error) throw r.error;
      return r.data as { sms_enabled: boolean };
    },
  });
  const logs = useQuery({
    queryKey: ["customer-sms-log"],
    queryFn: async () => {
      const r = await uiClient
        .from("customer_sms_admin_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (r.error) throw r.error;
      return r.data as { id: string; status: string; error: string; created_at: string }[];
    },
    refetchInterval: 30000,
  });
  return (
    <section className="mb-6 space-y-3 rounded-xl border bg-white p-4">
      <h3 className="font-semibold">Order ও Appointment SMS</h3>
      <p className="text-sm">
        SMS provider adapter ও API credentials server Secrets-এ বসানোর পরে চালু করুন। Provider-এর
        অনুমোদিত sender ও balance থাকতে হবে। এখানে কোনো secret লিখবেন না।
      </p>
      {settings.error && <p>SMS SQL update প্রয়োজন।</p>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          disabled={!settings.data}
          checked={settings.data?.sms_enabled || false}
          onChange={async (e) => {
            const r = await uiClient
              .from("customer_communication_settings")
              .update({ sms_enabled: e.target.checked })
              .eq("id", 1);
            if (r.error) return void toast.error(r.error.message);
            await qc.invalidateQueries({ queryKey: ["customer-sms-settings"] });
          }}
        />
        Customer SMS চালু
      </label>
      <button onClick={() => void logs.refetch()} className="rounded-lg border px-3 py-2 text-sm">
        SMS ফলাফল Refresh
      </button>
      {logs.error && <p>SMS log লোড হয়নি।</p>}
      {logs.data?.map((l) => (
        <p key={l.id} className="text-xs">
          {new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour12: true })}{" "}
          · {l.status} {l.error}
        </p>
      ))}
      <p className="text-xs">accepted মানে provider গ্রহণ করেছে; ফোনে delivery-এর নিশ্চয়তা নয়।</p>
    </section>
  );
}
