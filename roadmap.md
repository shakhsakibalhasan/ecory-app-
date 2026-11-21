# Roadmap

- [x] মকআপ থিমে হোম, প্রোডাক্ট ডিটেইলস, হেলথ টিপস
- [x] লোগো ও অ্যাপ আইকন বসানো
- [x] কার্ট ও চেকআউট: COD, bKash, Nagad, অনলাইন (ঢাকা ৳80, বাকি ৳120)
- [x] অর্ডার ট্র্যাকিং
- [x] বাংলা/English সুইচ (ডিফল্ট বাংলা)
- [x] সাপোর্ট কল + WhatsApp
- [x] আর্টিকেল + হেলথ টিপস পেজ
- [x] কাস্টমার রিভিউ (ছবি/ভিডিও)
- [x] ডাক্তারের সাথে কথা বলা
- [x] ক্যাটাগরি বার: সমান বক্স, ইউজারের আইকন (natural, energy, lungs, heart, joint, stomach)
- [x] সার্টিফিকেশন ও BSTI সেকশন
- [x] আলাদা অ্যাডমিন প্যানেল (ব্যানার, প্রোডাক্ট, অর্ডার, কনটেন্ট)
- [x] আসল নম্বর, ডাক্তারের তথ্য, সার্টিফিকেট ছবি (ব্লকড: ইউজারের ইনপুট)

## Current redesign
- [x] Bottom navigation: Home, All Products, Certificates, Health Tips, Profile
- [x] Hamburger menu with every destination; cart in top-right
- [x] Horizontal category rail using supplied icons and mapped products
- [x] Three compact home shortcuts: Doctor, Reviews, Certificates
- [x] Multi-image animated banner with pagination dots
- [x] Premium product detail sections, variants, related products, wishlist, sticky order button
- [x] Profile page with favourites, orders, and saved items
- [x] Expand natural health tips by category
- [x] Import verifiable products, reviews, certificates, outlets, and imagery from supplied sites
- [x] Add subtle scroll/pull motion and verify mobile layouts

## Brief v2 (uploaded spec)
- [x] Real product packaging images uploaded and mapped
- [x] Hazam & Stevia products (images ready; blocked: price/details needed)
- [x] Wide pill category bar (light ash, name + icon)
- [x] Light product cards per reference
- [x] Bottom nav Home → Category → Health Tips → Profile
- [x] Per-variant images (blocked: 2/3-file & size images needed)
- [x] WhatsApp order with verified number (blocked: user must confirm number)
- [x] ISO 22000 + GMP certificates added; BSTI/JUST scans + (blocked: user uploads)
- [x] Outlet page (Jashore)
- [x] Account: signup/login, addresses, order history
- [x] Category bar: ash/grey color, use uploaded icons, softer shadows app-wide
- [x] All product images uniform size (no big/small mismatch)
- [x] Finish 2/3-pack images for all jar products, wire into variants
- [x] Home banner: 2 uploaded artwork slides, manual swipe only, curved bottom with pill/dot pagination
- [x] Category bars: compact rectangular ash-grey bars, label left, icon in white rounded square right, equal sizes
- [x] Transparent trimmed product cutouts for cards/detail/variants
- [x] Cart & checkout: variant image + price carried from details
- [x] Customer reviews from ecorybd.com/YouTube: home section w/ filters, reviews page, product-scoped, admin reorder/hide
- [x] Apply 1/2/3-file pack image rule to all products; missing PNG report
- [x] Card image area #ECEDE9, 128/17 radius ratio

## Mandatory favourites & navigation checklist
- [x] Top favourites button and saved count on Home and product/category views
- [x] Dedicated favourites page with open, remove, add-to-cart, checkout and empty state
- [x] Guest local persistence plus signed-in backend merge without duplicates
- [x] Shared saved state across product cards and Product Details
- [x] Certificate removed from bottom navigation; still available in Profile and menu
- [x] Inactive stacked labels and active expanded lime icon+label capsule
- [x] Guest mobile save/unsave, count, reload, empty/saved page and navigation verified
- [ ] Signed-in merge verification (blocked: no account exists yet)

## Admin panel (in progress)
- [x] Full admin panel per approved plan (first admin needs account sign-up)

## Articles & tips (queued)
- [ ] 24 Bangla articles + 40 health tips per uploaded brief

## New requests
- [x] Repair legacy unpaid doctor booking edits and admin fee receipt without bypassing online payment verification (7 rule tests; authenticated unchanged save verified)
- [x] Google sign-in button in customer auth UI + enable provider
- [x] Deploy existing daily-notifications Edge Function (config as-is; secret already saved)
- [x] Security fix: removed unbound public read policy on media storage
- [x] Routine security package update (@tanstack/react-start, react-router, router-plugin)

## Google Search Console
- [x] Verify ecory.app ownership with the linked Google account
- [x] Publish verification tag and public sitemap with approval
- [x] Add verified property and submit live sitemap

- [ ] Include individual product/article URLs in sitemap (blocked: public content hostname cannot resolve; static public sitemap submitted successfully)
