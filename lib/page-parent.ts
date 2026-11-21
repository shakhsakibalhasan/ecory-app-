/** Canonical app hierarchy, independent of click/browser history. */
export function parentPage(pathname: string, search = ""): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const query = new URLSearchParams(search);
  if (path === "/") return null;
  if (path === "/admin") return "/admin";
  if (/^\/product\/[^/]+$/.test(path)) return "/products";
  if (/^\/article\/[^/]+$/.test(path)) return "/tips?kind=article";
  if (/^\/doctor-booking\/[^/]+$/.test(path)) return "/doctor-bookings";
  if (path === "/doctor-bookings" && query.get("doctor"))
    return `/doctor?doctor=${encodeURIComponent(query.get("doctor")!)}`;
  if (path === "/doctor-bookings" || path === "/favourites" || path === "/privacy")
    return "/profile";
  if (path === "/doctor" && query.get("doctor")) return "/doctor";
  if (path === "/offers" && query.get("offer")) return "/offers";
  if (path === "/products" && query.get("category")) return "/products";
  if (path === "/tips" && query.get("kind") === "saved") return "/tips?kind=article";
  if (path === "/checkout") {
    const offer = query.get("offer"),
      product = query.get("buy");
    if (offer) return `/offers?offer=${encodeURIComponent(offer)}`;
    if (product) return `/product/${encodeURIComponent(product)}`;
    return "/cart";
  }
  return "/";
}
