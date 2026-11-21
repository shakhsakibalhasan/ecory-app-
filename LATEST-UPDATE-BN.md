# Ecory latest update — 1.9

## যা বদলেছে
- সর্বশেষ ছবির lime green (#86BF3C) brand color।
- Add to Cart ও Order Now: filled button, সাদা লেখা, অল্প rounded corner।
- Floating order button ও Back button পুরো rounded।
- File/gram/ml নির্বাচন ছোট ও সমান grid; selected button lime green, text white।
- Notification নতুন বা edit form-এ “সেভ করে এখনই পাঠান”। প্রথমে edited message save, তারপর সেটিকেই push পাঠানোর অনুরোধ।
- আগে notification পাওয়া ফোনে দৈনিক সীমার কারণে আবার যাবে না। Notification permission চালু থাকতে হবে।

## Website/Admin update
১. ZIP Extract করুন। GitHub-এ একই path-এর files Replace করুন; বিশেষ করে src/styles.css, src/components/ProductCard.tsx, src/components/OrderBar.tsx, src/components/ui/button.tsx, src/components/Shell.tsx, src/components/AdminNotifications.tsx, src/routes/product.$id.tsx।
২. Commit করে Lovable Publish/Update করুন।
৩. Supabase Edge Function daily-notifications-এর index.ts নতুন supabase/functions/daily-notifications/index.ts দিয়ে Replace করে Deploy করুন। অথবা নিজের computer থেকে Supabase CLI থাকলে: supabase functions deploy daily-notifications
৪. শুধু APK install করলে admin web/Edge Function update হবে না।
৫. এই update-এর জন্য নতুন SQL লাগবে না। ZIP-এর আগের migrations আগে করা থাকলে আবার চালাবেন না।

## Android
নতুন 1.9 APK install করুন। আগের signing key ফিরে পাওয়া যায়নি; App not installed/conflicting package হলে পুরোনো test APK uninstall করে নতুনটি install করতে হবে। Uninstall করলে local cart, guest favourites ও device settings হারাতে পারে; server account/orders থাকবে।
নতুন APK খুলে notification চালু/Allow দিন; নতুন token নিবন্ধন হবে।
এটি test APK; Play Store upload-এর signed AAB নয়।
