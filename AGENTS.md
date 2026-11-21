<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep favourites in `StoreProvider`: guest saves use local storage, while signed-in saves merge into the user-owned `favourites` table so every product surface shares one state.
- Admin panel lives in `src/routes/admin.tsx`; all writes rely on `has_role(auth.uid(),'admin')` RLS, and admins are granted only via SQL on `user_roles` (no auto first-user promotion) — prevents self-escalation.
- Doctor booking fee receipts are admin-only for unpaid legacy rows with no checkout intent; the database guard protects gateway-linked payments and permits logistics edits without relabelling unpaid fees.
- Admin uploads go to the private `media` bucket and are stored as 10-year signed URLs, because public buckets are blocked on this project.
- Storefront reads categories, banners, outlets, contacts, delivery fees, payment switches and BSTI badges from the database; hard-coded values in `src/lib/contacts.ts`/`store.tsx` are fallbacks only.

- Every route declares `staticData.sitemap`; the router-derived sitemap enumerates only eligible public pages; dynamic content must use paginated published records through a session-free public client, so private content stays excluded.
