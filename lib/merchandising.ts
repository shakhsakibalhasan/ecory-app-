import type { Product, ProductVariant } from "@/lib/store";
export function offerPrice(product: Product, variant?: ProductVariant) {
  const price = variant?.price ?? product.price;
  // A variant never inherits another pack's crossed-out price.
  const old = variant ? variant.old_price : product.old_price;
  const oldPrice = old != null && old > price ? old : null;
  return {
    price,
    oldPrice,
    discount: oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0,
  };
}
type RatingRow = { product_id: string | null; rating: number | null };
const ratingIndexes = new WeakMap<
  RatingRow[],
  Map<string, { count: number; rating: number | null }>
>();
export function reviewStats(
  rows: { product_id: string | null; rating: number | null }[],
  productId: string,
) {
  let index = ratingIndexes.get(rows);
  if (!index) {
    index = new Map();
    const sums = new Map<string, { count: number; total: number; rated: number }>();
    for (const row of rows) {
      if (!row.product_id) continue;
      const item = sums.get(row.product_id) || { count: 0, total: 0, rated: 0 };
      item.count++;
      if (row.rating != null && Number.isFinite(row.rating) && row.rating >= 1 && row.rating <= 5) {
        item.total += row.rating;
        item.rated++;
      }
      sums.set(row.product_id, item);
    }
    sums.forEach((v, id) =>
      index!.set(id, { count: v.count, rating: v.rated ? v.total / v.rated : null }),
    );
    ratingIndexes.set(rows, index);
  }
  return index.get(productId) || { count: 0, rating: null };
}
