import { readGuestClaim, saveGuestClaim } from "@/lib/spin";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  Banknote,
  Wallet,
  Plus,
  Tag,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { OrderItemRow } from "@/components/OrderItemRow";
import { OrderAction } from "@/components/OrderAction";
import { BDT, deliveryFee, productVariants, useProducts, useSettings, useStore } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uiClient, EditableIcon } from "@/lib/presentation";
import { useOffers, offerProduct } from "@/lib/offers";
import locations from "@/data/bangladesh-locations.json";

type Item = { id: string; variantId?: string | undefined; qty: number };
type Address = {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  district_id?: string;
  upazila_id?: string;
  street_address?: string;
  local_area?: string;
};
type Search = {
  offer?: string | undefined;
  buy?: string | undefined;
  variant?: string | undefined;
  qty?: number | undefined;
};
export const Route = createFileRoute("/checkout")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): Search => ({
    offer: typeof s["offer"] === "string" ? s["offer"] : undefined,
    buy: typeof s["buy"] === "string" ? s["buy"] : undefined,
    variant: typeof s["variant"] === "string" ? s["variant"] : undefined,
    qty: Math.max(1, Math.min(99, Number(s["qty"]) || 1)),
  }),
  head: () => ({ meta: [{ title: "চেকআউট — ইকোরি" }, { name: "description", content: "ইকোরি পণ্যের অর্ডার ও পেমেন্ট সম্পন্ন করুন।" }, { property: "og:title", content: "চেকআউট — ইকোরি" }, { property: "og:description", content: "ইকোরি পণ্যের অর্ডার ও পেমেন্ট সম্পন্ন করুন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Checkout,
});
function Checkout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { lang, t, cart, clear, setQty, setVariant } = useStore();
  const bn = lang === "bn";
  const [promoOpen, setPromoOpen] = useState(false);
  const { user } = useSession();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: s, isLoading: settingsLoading } = useSettings();
  const { data: offers = [], isLoading: offersLoading } = useOffers();
  const offer = offers.find((o) => o.id === search.offer);
  const offerItem = offer
    ? offerProduct(
        offer,
        products.find((p) => p.id === offer.product_id),
      )
    : undefined;
  const direct = !!(search.buy || search.offer);
  const [buy, setBuy] = useState<Item[]>(() =>
    direct
      ? [
          {
            id: search.offer || search.buy!,
            variantId: search.offer ? undefined : search.variant,
            qty: search.qty ?? 1,
          },
        ]
      : [],
  );
  useEffect(
    () =>
      setBuy(
        direct
          ? [
              {
                id: search.offer || search.buy!,
                variantId: search.offer ? undefined : search.variant,
                qty: search.qty ?? 1,
              },
            ]
          : [],
      ),
    [search.buy, search.offer, search.variant, search.qty],
  );
  const items = direct ? buy : cart;
  const lines = items
    .map((c) => {
      const p = search.offer ? offerItem : products.find((x) => x.id === c.id);
      const vs = p ? productVariants(p) : [];
      const variant = c.variantId ? vs.find((v) => v.id === c.variantId) : vs[0];
      return {
        ...c,
        p,
        variant,
        price: variant?.price ?? p?.price ?? 0,
        invalid: !!c.variantId && !variant,
      };
    })
    .filter((l) => l.p);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const [promoInput, setPromoInput] = useState(() => {
    try {
      return sessionStorage.getItem("ecory-spin-selected-coupon") || "";
    } catch {
      return "";
    }
  });
  const [promo, setPromo] = useState<{
    code: string;
    discount: number;
    fingerprint: string;
  } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const promoFingerprint = JSON.stringify({
    offer: search.offer,
    lines: lines.map((l) => ({ id: l.id, variant: l.variant?.id, qty: l.qty, price: l.price })),
  });
  const promoApplied = promo?.fingerprint === promoFingerprint ? promo : null;
  const [spinReward, setSpinReward] = useState<{
    id: string;
    code: string;
    token: string;
    phone: string;
    discount: number;
    name: string;
    fingerprint: string;
    area: string;
    fee: number;
  } | null>(null);
  const [spinMessage, setSpinMessage] = useState("");

  useEffect(() => {
    setPromo(null);
    setPromoMessage("");
    setPendingCode("");
  }, [promoFingerprint]);
  const promoError = (error: unknown) => {
    const message = (error as { message?: string })?.message || "";
    return message.includes("PROMO_MINIMUM")
      ? bn
        ? "এই কোডের ন্যূনতম কেনাকাটার শর্ত পূরণ হয়নি"
        : "Minimum purchase requirement is not met"
      : message.includes("PROMO_CHANGED")
        ? bn
          ? "ছাড় পরিবর্তিত হয়েছে। কোড আবার Apply করুন"
          : "Discount changed. Apply the code again"
        : bn
          ? "কোডটি ভুল, বন্ধ, মেয়াদ শেষ বা ব্যবহারসীমা পূর্ণ"
          : "Code is invalid, disabled, expired or fully used";
  };
  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoMessage(bn ? "প্রোমো কোড লিখুন" : "Enter a promo code");
      return;
    }
    const fingerprint = promoFingerprint;
    setPromoBusy(true);
    setPromoMessage("");
    try {
      setSpinReward(null);
      const claim = readGuestClaim();
      let savedAward:
        | { id: string; prize: { coupon: string }; order_code: string | null; expires_at: string }
        | undefined;
      if (user) {
        if (claim?.token) await uiClient.rpc("attach_guest_spin", { _token: claim.token });
        const mine = await uiClient.rpc("my_spin_wins");
        if (!mine.error)
          savedAward = (
            mine.data as {
              id: string;
              prize: { coupon: string };
              order_code: string | null;
              expires_at: string;
            }[]
          ).find(
            (w) => w.prize.coupon === code && !w.order_code && new Date(w.expires_at) > new Date(),
          );
      }
      if (savedAward || claim?.award?.prize.coupon === code) {
        if (!district) {
          setPromoMessage(bn ? "আগে ঠিকানার জেলা বাছুন।" : "Select your delivery district first.");
          return;
        }
        const r = await uiClient.rpc("quote_saved_spin_coupon", {
          _award_id: savedAward?.id || claim!.award!.id,
          _code: code,
          _token: savedAward ? "" : claim!.token,
          _phone: f.phone,
          _subtotal: subtotal,
          _delivery: fee,
          _offer_id: search.offer || null,
        });
        if (r.error) throw r.error;
        setPromo(null);
        setSpinReward({
          id: r.data.id,
          code,
          token: savedAward ? "" : claim!.token,
          phone: f.phone,
          discount: r.data.discount,
          name: bn ? r.data.prize.name_bn : r.data.prize.name_en || r.data.prize.name_bn,
          fingerprint,
          area: f.district,
          fee,
        });
        setPendingCode("");
        setPromoMessage(bn ? "জেতার কুপন প্রয়োগ হয়েছে।" : "Winning coupon applied.");
        return;
      }
      const r = await uiClient.rpc("quote_promo", { _code: code, _subtotal: subtotal });
      if (r.error) throw r.error;
      const result = r.data as { code: string; discount: number };
      if (!result || typeof result.discount !== "number") throw new Error("Invalid response");
      setPromo({ code: result.code, discount: result.discount, fingerprint });
      setPendingCode("");
      setPromoMessage(bn ? "প্রোমো কোড প্রয়োগ হয়েছে" : "Promo applied");
    } catch (e) {
      setPromo(null);
      const m = (e as { message?: string }).message || "";
      setPromoMessage(
        m.includes("SPIN_MINIMUM")
          ? bn
            ? "কুপনের ন্যূনতম কেনাকাটার শর্ত পূরণ হয়নি।"
            : "Minimum purchase requirement is not met."
          : m.includes("SPIN_PHONE_MISMATCH")
            ? bn
              ? "স্পিনে দেওয়া একই ফোন নম্বর ব্যবহার করুন।"
              : "Use the same phone number entered for the spin."
            : m.includes("SPIN_OFFER_MISMATCH")
              ? bn
                ? "এই কুপনটি আপনার জেতা নির্দিষ্ট Offer-এ ব্যবহার করুন।"
                : "Use this coupon on your winning offer."
              : m.includes("SPIN_COUPON")
                ? bn
                  ? "কুপনটি ব্যবহার হয়েছে, মেয়াদ শেষ বা এই ব্রাউজারে জেতা হয়নি।"
                  : "Coupon used, expired, or not won in this browser."
                : promoError(e),
      );
    } finally {
      setPromoBusy(false);
    }
  };
  const [f, setF] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
    email: "",
    district: "",
    upazila: "",
    locality: "",
  });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [editing, setEditing] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);
  const [pay, setPay] = useState<"cod" | "bkash" | "online" | "nagad">("cod");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState("");
  const lock = useRef(false);
  const paymentFingerprint = useRef("");
  const district = locations.districts.find((d) => d.id === f.district);
  const upazilas = locations.upazilas.filter((u) => u.district_id === f.district);
  const upazila = upazilas.find((u) => u.id === f.upazila);
  const area = district?.name.toLowerCase() === "dhaka" ? "dhaka" : "outside";
  const fee = deliveryFee(s, area, subtotal);
  const spinApplied =
    !promoApplied &&
    spinReward?.fingerprint === promoFingerprint &&
    spinReward.area === f.district &&
    spinReward.fee === fee &&
    spinReward.phone === f.phone
      ? spinReward
      : null;
  const promoDiscount = promoApplied?.discount ?? spinApplied?.discount ?? 0;
  useEffect(() => {
    setSpinReward(null);
    setSpinMessage("");
  }, [promoFingerprint, f.district, f.phone]);

  const loadAddress = (a: Address) => {
    setSelectedAddress(a.id);
    setF((cur) => ({
      ...cur,
      name: a.name,
      phone: a.phone,
      address: a.street_address || a.address,
      district: a.district_id || "",
      upazila: a.upazila_id || "",
      locality: a.local_area || "",
    }));
    setEditing(!a.district_id || !a.upazila_id);
  };
  useEffect(() => {
    let active = true;
    setAddresses([]);
    if (!user) {
      try {
        const draft = JSON.parse(localStorage.getItem("ecory-delivery-address") || "null");
        if (draft) setF((cur) => ({ ...cur, ...draft }));
      } catch {}
      return;
    }
    void (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        uiClient
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setAddresses(a || []);
      if (a?.[0]) loadAddress(a[0] as Address);
      else
        setF((cur) => ({
          ...cur,
          name: p?.full_name || cur.name,
          phone: p?.phone || cur.phone,
          email: user.email || cur.email,
        }));
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);
  const changeQty = (item: Item, qty: number) => {
    setPendingCode("");
    if (direct)
      setBuy((cur) =>
        qty < 1
          ? cur.filter((x) => x !== item && !(x.id === item.id && x.variantId === item.variantId))
          : cur.map((x) =>
              x.id === item.id && x.variantId === item.variantId ? { ...x, qty } : x,
            ),
      );
    else setQty(item.id, qty, item.variantId);
  };
  const changeVariant = (item: Item, variantId: string) => {
    setPendingCode("");
    if (direct)
      setBuy((cur) =>
        cur.map((x) =>
          x.id === item.id && x.variantId === item.variantId ? { ...x, variantId } : x,
        ),
      );
    else setVariant(item.id, item.variantId, variantId);
  };
  const fullAddress = [
    f.address.trim(),
    upazila ? (bn ? upazila.bn_name : upazila.name) : f.locality.trim(),
    district ? (bn ? district.bn_name : district.name) : "",
  ]
    .filter(Boolean)
    .join(", ");
  const validate = () => {
    if (
      !lines.length ||
      lines.length !== items.length ||
      lines.some((l) => l.invalid || !l.p?.in_stock || l.variant?.in_stock === false)
    ) {
      toast.error(
        bn ? "পণ্যের সাইজ ও স্টক আবার যাচাই করুন" : "Please check product options and stock",
      );
      return false;
    }
    if (
      !f.name.trim() ||
      !/^01\d{9}$/.test(f.phone) ||
      f.address.trim().length < 5 ||
      !district ||
      (!upazila && !f.locality.trim())
    ) {
      setEditing(true);
      toast.error(
        bn
          ? "নাম, ১১ সংখ্যার ফোন, জেলা, উপজেলা/থানা ও পূর্ণ ঠিকানা দিন"
          : "Enter name, mobile, district, upazila/area and full address",
      );
      return false;
    }
    return true;
  };
  const persistAddress = async () => {
    const draft = {
      name: f.name,
      phone: f.phone,
      address: f.address,
      district: f.district,
      upazila: f.upazila,
      locality: f.locality,
    };
    localStorage.setItem("ecory-delivery-address", JSON.stringify(draft));
    if (user && saveAddress) {
      const row = {
        user_id: user.id,
        name: f.name.trim(),
        phone: f.phone,
        address: fullAddress,
        street_address: f.address.trim(),
        district_id: f.district,
        upazila_id: f.upazila,
        local_area: f.locality.trim(),
        label: bn ? "ডেলিভারি ঠিকানা" : "Delivery address",
        area,
        is_default: addresses.length === 0,
      };
      const { error } = selectedAddress
        ? await uiClient
            .from("addresses")
            .update(row)
            .eq("id", selectedAddress)
            .eq("user_id", user.id)
        : await uiClient.from("addresses").insert(row);
      if (error)
        toast.info(
          bn
            ? "অর্ডার ঠিকানা পাওয়া গেছে, তবে account-এ ঠিকানা সেভ হয়নি"
            : "Order address is available, but saving to your account failed",
        );
    }
  };
  const createOrder = async (method: string) => {
    const payload = {
      _name: f.name.trim(),
      _phone: f.phone,
      _address: fullAddress,
      _area: area,
      _payment: method,
      _trx: "",
      _note: f.note.trim(),
      _items: lines.map((l) => ({ id: l.id, qty: l.qty, variantId: l.variant?.id })),
    };
    const { data, error } = spinApplied
      ? await uiClient.rpc("place_saved_spin_order", {
          _award_id: spinApplied.id,
          _code: spinApplied.code,
          _token: spinApplied.token,
          _expected_discount: spinApplied.discount,
          _name: payload._name,
          _phone: payload._phone,
          _address: payload._address,
          _area: payload._area,
          _payment: method,
          _note: payload._note,
          _items: payload._items,
          _offer_id: search.offer || null,
          _qty: lines[0]?.qty ?? 1,
        })
      : promoApplied
        ? await uiClient.rpc("place_order_with_promo", {
            _name: payload._name,
            _phone: payload._phone,
            _address: payload._address,
            _area: payload._area,
            _payment: method,
            _note: payload._note,
            _items: payload._items,
            _promo: promoApplied.code,
            _expected_discount: promoApplied.discount,
            _offer_id: search.offer || null,
            _qty: lines[0]?.qty ?? 1,
          })
        : search.offer
          ? await uiClient.rpc("place_offer_order", {
              _offer_id: search.offer,
              _qty: lines[0]?.qty ?? 1,
              _name: payload._name,
              _phone: payload._phone,
              _address: payload._address,
              _area: payload._area,
              _payment: method,
              _note: payload._note,
            })
          : await supabase.rpc("place_order", payload);
    if (error && promoApplied) {
      setPromo(null);
      setPendingCode("");
      throw new Error(promoError(error));
    }
    if (error || !data)
      throw new Error(
        bn ? "অর্ডার সম্পন্ন হয়নি। আবার চেষ্টা করুন।" : "Could not create order. Please retry.",
      );
    if (spinApplied) {
      const claim = readGuestClaim();
      if (claim?.award)
        saveGuestClaim({ ...claim, award: { ...claim.award, order_code: data as string } });
    }
    void supabase.functions
      .invoke("customer-sms", { body: { order_code: data, phone: payload._phone } })
      .catch(() => {});
    return data as string;
  };
  const startPayment = async (method: "bkash" | "online" | "nagad") => {
    if (lock.current || !validate()) return;
    // A real gateway session supplies the provider URL; never collect PIN/OTP in Ecory.
    if (!/^\S+@\S+\.\S+$/.test(f.email)) {
      setEditing(true);
      toast.info(
        bn ? "অনলাইন পেমেন্টের রসিদের জন্য Email দিন" : "Enter your email for the payment receipt",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setPay(method);
    const popup = window.open("about:blank", "ecory-payment", "width=460,height=720");
    try {
      const { data: ready, error: readyError } = await supabase.functions.invoke("payment-start", {
        body: { action: "ready" },
      });
      if (readyError || !ready?.ready)
        throw new Error(
          bn
            ? "এই পেমেন্ট পদ্ধতি এখন চালু নেই। ক্যাশ অন ডেলিভারি বেছে নিন।"
            : "This payment method is currently unavailable. Choose Cash on Delivery.",
        );
      const fingerprint = JSON.stringify({
        method,
        name: f.name,
        phone: f.phone,
        address: fullAddress,
        items: lines.map((l) => ({ id: l.id, variant: l.variant?.id, qty: l.qty, price: l.price })),
        fee,
        promo: promoApplied?.code || spinApplied?.code,
        discount: promoDiscount,
      });
      const code =
        pendingCode && paymentFingerprint.current === fingerprint
          ? pendingCode
          : await createOrder(method);
      setPendingCode(code);
      paymentFingerprint.current = fingerprint;
      await persistAddress();
      const { data, error } = await supabase.functions.invoke("payment-start", {
        body: { code, phone: f.phone, email: f.email, method },
      });
      if (error || !data?.url)
        throw new Error(
          bn ? "পেমেন্ট খোলা যায়নি। পুনরায় চেষ্টা করুন।" : "Could not open payment. Please retry.",
        );
      const u = new URL(data.url);
      if (
        u.protocol !== "https:" ||
        !(u.hostname.endsWith(".sslcommerz.com") || u.hostname === "sslcommerz.com")
      )
        throw new Error("Invalid payment URL");
      if (popup) popup.location.href = u.href;
      else window.location.assign(u.href);
      toast.info(
        bn
          ? "পেমেন্ট শেষ হলে অর্ডার ট্র্যাকিংয়ে যাচাই করুন"
          : "Check order tracking after completing payment",
      );
    } catch (e) {
      popup?.close();
      toast.error((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (s?.payments && (s.payments as Record<string, boolean>)[pay] === false) {
      toast.error(
        bn
          ? "এই পেমেন্ট মাধ্যম এখন বন্ধ। অন্য মাধ্যম বেছে নিন।"
          : "This payment method is disabled. Choose another method.",
      );
      return;
    }
    if (pay !== "cod") {
      await startPayment(pay);
      return;
    }
    if (lock.current || !validate()) return;
    lock.current = true;
    setBusy(true);
    try {
      const code = await createOrder("cod");
      await persistAddress();
      if (!direct) clear();
      setDone(code);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (done)
    return (
      <Shell title={t("checkout")} hideNavigation>
        <section className="ecory-section mt-8 text-center">
          <EditableIcon name="icon_check_circle2">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          </EditableIcon>
          <h2 className="mt-4 text-xl font-semibold">{t("orderDone")}</h2>
          <p className="mt-3 font-semibold">{done}</p>
          <Link
            to="/track"
            search={{ code: done }}
            className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 font-semibold"
          >
            {t("track")}
          </Link>
        </section>
      </Shell>
    );
  const field =
    "ecory-field w-full rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:border-primary";
  const payOptions = [
    {
      key: "cod" as const,
      title: bn ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery",
      tag: bn ? "পণ্য হাতে পেয়ে নগদে মূল্য পরিশোধ করুন" : "Pay with cash when your order arrives",
      icon: Banknote,
    },
    {
      key: "bkash" as const,
      title: "bKash",
      tag: bn ? "বিকাশ মোবাইল ওয়ালেট দিয়ে নিরাপদ পেমেন্ট" : "Pay securely with your bKash wallet",
      icon: Wallet,
    },
    {
      key: "online" as const,
      title: bn ? "অনলাইন পেমেন্ট" : "Online Payment",
      tag: bn
        ? "Visa, MasterCard, Amex ও ব্যাংকিং অপশন"
        : "Visa, MasterCard, Amex and banking options",
      icon: CreditCard,
    },
  ];
  return (
    <Shell
      title={t("checkout")}
      hideNavigation
      bottomBar={
        lines.length ? (
          <OrderAction
            total={subtotal - promoDiscount + (district ? fee : 0)}
            onClick={() => void submit()}
            busy={busy}
            disabled={
              promoBusy ||
              productsLoading ||
              settingsLoading ||
              (search.offer ? offersLoading : false)
            }
          />
        ) : undefined
      }
    >
      {productsLoading || (search.offer && offersLoading) ? (
        <p className="py-12 text-center">{bn ? "লোড হচ্ছে…" : "Loading…"}</p>
      ) : !lines.length ? (
        <p className="py-12 text-center">{t("emptyCart")}</p>
      ) : (
        <div className="space-y-4 pb-4">
          <section className="ecory-section">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="ecory-section-title">
                {bn ? "ডেলিভারি ঠিকানা" : "Delivery Location"}
              </h2>
              <button
                className="flex items-center gap-1 text-xs text-accent-foreground"
                onClick={() => {
                  setSelectedAddress("");
                  setEditing(true);
                  setF((cur) => ({ ...cur, address: "", district: "", upazila: "", locality: "" }));
                }}
              >
                <EditableIcon name="icon_plus">
                  <Plus size={14} />
                </EditableIcon>
                {bn ? "নতুন ঠিকানা" : "Add New"}
              </button>
            </div>
            {addresses.length > 0 && (
              <label className="mb-3 block text-xs text-muted-foreground">
                {bn ? "সংরক্ষিত ঠিকানা" : "Saved addresses"}
                <select
                  className={`${field} mt-1`}
                  value={selectedAddress}
                  onChange={(e) => {
                    const a = addresses.find((x) => x.id === e.target.value);
                    if (a) loadAddress(a);
                  }}
                >
                  <option value="">{bn ? "ঠিকানা বেছে নিন" : "Choose address"}</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.address}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!editing && (
              <button
                className="w-full rounded-xl border border-primary bg-primary-soft p-3 text-left"
                onClick={() => setEditing(true)}
              >
                <p className="font-semibold">{f.name}</p>
                <p className="mt-1 text-sm">{f.phone}</p>
                <p className="mt-1 text-xs leading-relaxed">{fullAddress}</p>
                <p className="mt-2 text-xs text-accent-foreground">
                  {bn ? "ঠিকানা পরিবর্তন" : "Change address"}
                </p>
              </button>
            )}
            {editing && (
              <div className="space-y-3">
                <label className="block text-xs">
                  {t("name")}
                  <input
                    className={`${field} mt-1`}
                    maxLength={100}
                    value={f.name}
                    onChange={(e) => setF({ ...f, name: e.target.value })}
                  />
                </label>
                <label className="block text-xs">
                  {t("phone")}
                  <input
                    className={`${field} mt-1`}
                    inputMode="tel"
                    maxLength={11}
                    value={f.phone}
                    onChange={(e) =>
                      setF({
                        ...f,
                        phone: e.target.value
                          .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
                          .replace(/\D/g, ""),
                      })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {bn ? "পূর্ণ ঠিকানা / বাড়ি / রাস্তা" : "Street / House / Full address"}
                  <textarea
                    className={`${field} mt-1`}
                    rows={2}
                    maxLength={400}
                    value={f.address}
                    onChange={(e) => {
                      setPendingCode("");
                      setF({ ...f, address: e.target.value });
                    }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0 text-xs">
                    {bn ? "শহর / জেলা" : "City / District"}
                    <select
                      className={`${field} mt-1`}
                      value={f.district}
                      onChange={(e) => {
                        setPendingCode("");
                        setF({ ...f, district: e.target.value, upazila: "", locality: "" });
                      }}
                    >
                      <option value="">{bn ? "জেলা নির্বাচন" : "Select district"}</option>
                      {[...locations.districts]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {bn ? d.bn_name : d.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="min-w-0 text-xs">
                    {bn ? "উপজেলা / থানা" : "Upazila / Area"}
                    <select
                      className={`${field} mt-1`}
                      value={f.upazila}
                      disabled={!f.district}
                      onChange={(e) => {
                        setPendingCode("");
                        setF({ ...f, upazila: e.target.value, locality: "" });
                      }}
                    >
                      <option value="">{bn ? "উপজেলা নির্বাচন" : "Select upazila"}</option>
                      {upazilas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {bn ? u.bn_name : u.name}
                        </option>
                      ))}
                      <option value="other">
                        {bn ? "শহরের থানা / অন্যান্য" : "City area / Other"}
                      </option>
                    </select>
                  </label>
                </div>
                {f.upazila === "other" && (
                  <label className="block text-xs">
                    {bn ? "থানা / এলাকার নাম" : "Thana / Local area"}
                    <input
                      className={`${field} mt-1`}
                      value={f.locality}
                      onChange={(e) => setF({ ...f, locality: e.target.value })}
                    />
                  </label>
                )}
                <label className="block text-xs">
                  {bn ? "Email (অনলাইন পেমেন্টের জন্য)" : "Email (for online payment)"}
                  <input
                    type="email"
                    className={`${field} mt-1`}
                    value={f.email}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                  />
                </label>
                {user ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    {bn ? "এই ঠিকানা account-এ সেভ করুন" : "Save this address to my account"}
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {bn
                      ? "অ্যাকাউন্টে লগইন করলে ঠিকানা ও অর্ডার সংরক্ষণ হবে।"
                      : "Log in to keep addresses and order history."}
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="ecory-section">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="ecory-section-title">{bn ? "অর্ডারের পণ্য" : "Order Items"}</h2>
              {direct ? (
                <button
                  type="button"
                  onClick={() => {
                    const row = document.querySelector<HTMLElement>(".ecory-item-row");
                    row?.scrollIntoView({ block: "center", behavior: "smooth" });
                    row?.querySelector<HTMLElement>("select,button")?.focus();
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-accent-foreground"
                >
                  <ShoppingBag size={14} />
                  {bn ? "পণ্য সম্পাদনা" : "Edit item"}
                </button>
              ) : (
                <Link
                  to="/cart"
                  className="flex items-center gap-1 text-xs font-semibold text-accent-foreground"
                >
                  <ShoppingBag size={14} />
                  {bn ? "কার্ট সম্পাদনা" : "Edit cart"}
                </Link>
              )}
            </div>
            <div className="space-y-3">
              {lines.map((l) => (
                <OrderItemRow
                  key={`${l.id}-${l.variantId ?? "base"}`}
                  product={l.p!}
                  offerId={search.offer}
                  variantId={l.variant?.id}
                  qty={l.qty}
                  onQty={(q) => changeQty(l, q)}
                  onVariant={(v) => changeVariant(l, v)}
                  onRemove={() => changeQty(l, 0)}
                />
              ))}
            </div>
          </section>
          <section className="ecory-section">
            <h2 className="ecory-section-title mb-3">
              {bn ? "ডেলিভারি নির্দেশনা" : "Delivery Notes"}
            </h2>
            <textarea
              className={field}
              rows={2}
              maxLength={500}
              placeholder={
                bn
                  ? "ডেলিভারির জন্য বিশেষ নির্দেশনা (ঐচ্ছিক)"
                  : "Optional instructions for delivery"
              }
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </section>
          <section className="ecory-section">
            <h2 className="ecory-section-title mb-4">{bn ? "মোট বিল" : "Total Bill"}</h2>
            {!user && (
              <div className="mb-3 rounded-xl border p-3 text-sm">
                {bn
                  ? "লগইন ছাড়াই অর্ডার করতে পারবেন। ঠিকানা account-এ রাখতে চাইলে লগইন করুন।"
                  : "You can order without signing in. Sign in if you want to save addresses to your account."}{" "}
                <Link to="/profile" className="font-semibold underline">
                  {bn ? "লগইন" : "Sign in"}
                </Link>
              </div>
            )}
            {spinMessage && (
              <p role="status" className="mb-3 text-sm">
                {spinMessage}
              </p>
            )}
            {spinApplied && (
              <div className="mb-3 rounded-xl border border-primary/25 bg-primary-soft p-3 text-sm">
                <strong>🎁 {spinApplied.name}</strong>
                <p>
                  {BDT(spinApplied.discount)}{" "}
                  {bn
                    ? "জেতার কুপন প্রয়োগ হয়েছে। অন্য Promo দিলে এটি প্রযোজ্য হবে না।"
                    : "Winning coupon applied. Cannot be combined with another promo."}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPromoOpen(!promoOpen)}
              aria-expanded={promoOpen}
              className="mb-3 flex w-full items-center gap-3 rounded-xl border border-black/5 bg-white p-3 text-left"
            >
              <span className="rounded-lg bg-primary-soft p-2 text-accent-foreground">
                <Tag size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">
                  {bn ? "প্রোমো কোড ব্যবহার করুন" : "Apply a promo code"}
                </strong>
                <span className="block text-xs">
                  {promoApplied
                    ? promoApplied.code
                    : bn
                      ? "কোড লিখে ছাড় নিন"
                      : "Enter your code for a discount"}
                </span>
              </span>
              <ChevronRight size={19} />
            </button>
            {promoOpen && (
              <div className="mb-4">
                {" "}
                <div className="flex gap-2">
                  <input
                    aria-label={bn ? "প্রোমো কোড" : "Promo code"}
                    placeholder={bn ? "প্রোমো কোড লিখুন" : "Enter promo code"}
                    value={promoInput}
                    disabled={busy || promoBusy}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setSpinReward(null);
                      setPromo(null);
                      setPromoMessage("");
                      setPendingCode("");
                    }}
                    className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy || promoBusy || !promoInput.trim()}
                    onClick={() => void applyPromo()}
                    className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {promoBusy ? (bn ? "যাচাই…" : "Checking…") : bn ? "প্রয়োগ করুন" : "Apply"}
                  </button>
                </div>
                {promoMessage && (
                  <p role="status" className="mt-2 text-sm">
                    {promoMessage}
                  </p>
                )}
                {promoApplied && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary-soft p-3 text-sm">
                    <span>
                      <strong>{promoApplied.code}</strong> · {BDT(promoDiscount)}{" "}
                      {bn ? "ছাড়" : "discount"}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setPromo(null);
                        setPromoMessage("");
                        setPromoInput("");
                        setPendingCode("");
                      }}
                      className="underline"
                    >
                      {bn ? "সরান" : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3 text-sm">
              <p className="flex justify-between">
                <span>{bn ? "পণ্যের মোট মূল্য" : "Total Product Price"}</span>
                <span>{BDT(subtotal)}</span>
              </p>
              <p className="flex justify-between">
                <span>{t("delivery")}</span>
                <span>
                  {!district
                    ? "—"
                    : fee === 0
                      ? bn
                        ? "ফ্রি ডেলিভারি"
                        : "Free Delivery"
                      : BDT(fee)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {bn
                  ? "ঢাকা ৳৮০ · ঢাকার বাইরে ৳১২০। প্রযোজ্য Free Delivery অফার থাকলে চার্জ বাদ যাবে।"
                  : "Dhaka ৳80 · Outside ৳120. Eligible free delivery offers apply."}
              </p>
              {spinApplied && (
                <p className="flex justify-between">
                  <span>{bn ? "স্পিন পুরস্কারের ছাড়" : "Spin reward discount"}</span>
                  <strong>−{BDT(spinApplied.discount)}</strong>
                </p>
              )}
              {promoApplied && (
                <p className="flex justify-between">
                  <span>
                    {bn ? "প্রোমো ছাড়" : "Promo discount"} ({promoApplied.code})
                  </span>
                  <strong className="text-accent-foreground">−{BDT(promoDiscount)}</strong>
                </p>
              )}
              <p className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>{t("total")}</span>
                <span className="ecory-price">
                  {BDT(subtotal - promoDiscount + (district ? fee : 0))}
                </span>
              </p>
            </div>
          </section>
          <section className="ecory-section">
            <h2 className="ecory-section-title mb-4">{bn ? "পেমেন্ট পদ্ধতি" : "Payment Method"}</h2>
            <div className="space-y-3">
              {payOptions.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  disabled={busy || promoBusy}
                  onClick={() => {
                    setPay(m.key);
                    if (m.key !== "cod") void startPayment(m.key);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${pay === m.key ? "border-primary bg-primary-soft" : "border-border/60 bg-white"}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${m.key === "bkash" ? "text-[#d12053]" : "text-accent-foreground"}`}
                  >
                    <EditableIcon name={`payment_${m.key}`} className="h-8 w-8">
                      <m.icon size={24} />
                    </EditableIcon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{m.title}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                      {m.tag}
                    </span>
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${pay === m.key ? "border-primary" : "border-muted-foreground/40"}`}
                  >
                    {pay === m.key && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}
