export type PostTab = "tip" | "article" | "saved";
type ListPost = {
  id: string;
  kind: string;
  category: string;
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  excerpt_bn: string;
  excerpt_en: string;
  created_at: string;
};
export function visiblePosts<T extends ListPost>(
  posts: T[],
  tab: PostTab,
  category: string | null,
  query: string,
  saved: string[],
) {
  const term = query.trim().toLowerCase();
  return posts
    .filter(
      (post) =>
        (tab === "saved"
          ? post.kind === "article" && saved.includes(post.id)
          : post.kind === tab) &&
        (tab !== "tip" || !category || post.category === category) &&
        (!term ||
          [
            post.title_bn,
            post.title_en,
            post.body_bn,
            post.body_en,
            post.excerpt_bn,
            post.excerpt_en,
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    )
    .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
}
