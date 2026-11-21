import { test, expect } from "bun:test";
import { collectSitemapPages, sitemapXML } from "./sitemap.ts";

test("public sitemap covers ecory.app and deduplicates entries", () => {
  const xml = sitemapXML("https://ecory.app", [{ path: "/" }, { path: "/products" }, { path: "/" }]);
  expect(xml.match(/<loc>/g)?.length).toBe(2);
  expect(xml).toContain("<loc>https://ecory.app/</loc>");
  expect(xml).toContain("<loc>https://ecory.app/products</loc>");
});
test("content pagination reads every batch", async () => {
  const calls = [];
  const all = await collectSitemapPages(async (offset, size) => { calls.push(offset); return [1, 2, 3, 4, 5].slice(offset, offset + size); }, 2);
  expect(all).toEqual([1, 2, 3, 4, 5]);
  expect(calls).toEqual([0, 2, 4, 5]);
});
test("a later page failure rejects the complete sitemap collection", async () => {
  await expect(collectSitemapPages(async (offset) => { if (offset > 0) throw new Error("Public query failed"); return [1, 2]; }, 2)).rejects.toThrow("Public query failed");
});
