import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { useQuery } from "@/lib/query";
import { uiClient } from "@/lib/presentation";
import { toast } from "sonner";
export function AdminCustomerReviews() {
  const [page, setPage] = useState(0),
    [state, setState] = useState("all"),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-customer-reviews", page, search, state],
    queryFn: async () => {
      const r = await uiClient.rpc("admin_customer_product_reviews", {
        _page: page,
        _search: search,
        _state: state,
      });
      if (r.error) throw r.error;
      return r.data as {
        total: number;
        rows: {
          id: string;
          name: string;
          product_name: string;
          rating: number;
          body: string;
          hidden: boolean;
          created_at: string;
        }[];
      };
    },
  });
  const manage = async (id: string, action: string) => {
    if (busy) return;
    if (action === "delete" && !confirm("এই গ্রাহকের রিভিউ স্থায়ীভাবে মুছবেন?")) return;
    setBusy(id);
    try {
      const r = await uiClient.rpc("manage_customer_product_review", { _id: id, _action: action });
      if (r.error) throw r.error;
      if (!r.data) throw Error("Review not found");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-customer-reviews"] }),
        qc.invalidateQueries({ queryKey: ["review-ratings"] }),
        qc.invalidateQueries({ queryKey: ["product-customer-reviews"] }),
      ]);
      toast.success("আপডেট হয়েছে");
    } catch {
      toast.error("আপডেট হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="admin-customer-review-section">
      <h3>গ্রাহকের স্টার ও টেক্সট রিভিউ</h3>
      <p>পণ্যের rating শুধু এই রিভিউগুলোর গড় থেকে দেখাবে। লুকানো রিভিউ rating-এ গণনা হবে না।</p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSearch(draft.trim());
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={100}
          aria-label="গ্রাহকের রিভিউ খুঁজুন"
          placeholder="নাম / পণ্য / মন্তব্য খুঁজুন"
        />
        <button>খুঁজুন</button>
        <select
          value={state}
          aria-label="গ্রাহকের রিভিউ অবস্থা"
          onChange={(e) => {
            setState(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">সব</option>
          <option value="visible">দৃশ্যমান</option>
          <option value="hidden">লুকানো</option>
        </select>
      </form>
      {q.isPending ? (
        <p role="status">রিভিউ লোড হচ্ছে…</p>
      ) : q.isError ? (
        <p role="alert">
          রিভিউ পাওয়া যায়নি। PRODUCT-CUSTOMER-REVIEWS.sql চালিয়ে{" "}
          <button onClick={() => void q.refetch()}>আবার চেষ্টা করুন</button>।
        </p>
      ) : (
        <>
          <p>মোট {q.data?.total.toLocaleString("bn-BD")} টি</p>
          <div className="admin-spin-participants-grid">
            {q.data?.rows.map((r) => (
              <article className="admin-spin-person-card" key={r.id}>
                <div className="flex items-center justify-between gap-2">
                  <h4>{r.name}</h4>
                  <span>{r.hidden ? "লুকানো" : "দৃশ্যমান"}</span>
                </div>
                <p>{r.product_name}</p>
                <p className="flex items-center gap-1">
                  <Star size={14} />
                  {r.rating.toLocaleString("bn-BD")} / ৫
                </p>
                <p className="whitespace-pre-wrap break-words">{r.body}</p>
                <time>
                  {new Date(r.created_at).toLocaleString("bn-BD", {
                    timeZone: "Asia/Dhaka",
                    hour12: true,
                  })}
                </time>
                <div className="admin-product-card-actions">
                  <button
                    type="button"
                    disabled={!!busy}
                    className="admin-edit-button"
                    onClick={() => void manage(r.id, r.hidden ? "show" : "hide")}
                  >
                    {r.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
                    {r.hidden ? "দেখান" : "লুকান"}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    className="admin-delete-button"
                    onClick={() => void manage(r.id, "delete")}
                  >
                    <Trash2 size={14} />
                    মুছুন
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!q.data?.rows.length && <p>কোনো রিভিউ নেই।</p>}
          <div className="flex items-center justify-between gap-2">
            <button disabled={!page || q.isFetching} onClick={() => setPage((p) => p - 1)}>
              আগের
            </button>
            <span>পৃষ্ঠা {(page + 1).toLocaleString("bn-BD")}</span>
            <button
              disabled={q.isFetching || (page + 1) * 20 >= (q.data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              পরের
            </button>
          </div>
        </>
      )}
    </section>
  );
}
