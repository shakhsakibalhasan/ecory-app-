ECORY — LOGIN-FREE ORDER ও SPIN COUPON + PRIVACY UPDATE

শেষ নির্দেশনা অনুযায়ী:
সাধারণ product, offer, promo ও spin-এ জেতা কুপন দিয়ে order করতে login লাগে না।
Spin coupon ব্যবহারে যে app/browser-এ spin হয়েছে তার private claim token এবং spin-এর একই ফোন নম্বর লাগবে। শুধু coupon code জানা বা অন্য ফোন দেওয়া যথেষ্ট নয়। Browser data clear, app uninstall বা অন্য device-এ গেলে token না থাকায় guest coupon উদ্ধার নাও হতে পারে; আগে account-এ যুক্ত করা পুরস্কার login করে পাওয়া যায়। Token link/URL-এ প্রকাশ করা হয়নি।
কুপন একবারের বেশি খরচ হয় না; minimum order, expiry ও offer restriction আগের মতো। ডাবল submit হলে একই order code ফেরত আসে। Guest order কেবল order code ও phone দিয়ে track করা যাবে; My Orders-এ automatic account linking যোগ করা হয়নি।

কীভাবে বসাবেন:
1. ZIP Extract করুন।
2. src-এর matching source files GitHub-এ Upload/Replace করুন। supabase migration ও setup ফাইলও সংশ্লিষ্ট folder-এ রাখুন। Commit করুন।
3. Lovable Cloud/Supabase SQL Editor-এ setup/oct18-guest-spin-checkout.sql-এর পুরো লেখা NEW query-তে paste করে Run করুন। Success প্রয়োজন। পুরোনো SQL মুছতে হবে না। একই SQL আবার চালালেও চলবে। Migration automation থাকলে একই migration প্রয়োগ করলেই হবে, দুবার করা জরুরি নয়। আগের spin/profile SQL deployed থাকতে হবে।
4. Lovable sync শেষে Publish/Update করুন। শুধু GitHub-এ SQL upload করলেই database update হয় না।
5. Signed-out browser-এ spin করে coupon নিন; একই phone দিয়ে district/address পূরণ করে coupon Apply করুন, test COD order দিন; admin order total ও tracking যাচাই করুন।
6. APK/AAB bundled UI-তে এই পরিবর্তন দেখতে নতুন build লাগবে। আগের দেওয়া build-এ এই update নেই।

আগের Privacy Policy ও manual email-based deletion request source এই ZIP-এও আছে। Account deletion automatic নয়; support-কে যাচাই করে fulfil করতে হবে।

Verification:
Android web build এবং TypeScript checks PASS। Isolated PostgreSQL-এ guest token redemption, permissions, wrong token/phone, minimum, expiry, discount rollback, idempotent redemption, account ownership ও পূর্বের spin tests PASS। Live order/payment/phone test করা হয়নি।
