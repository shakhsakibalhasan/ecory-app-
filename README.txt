Ecory — ৭ অক্টোবরের একসাথে আপডেট

কী করা হয়েছে
১. ছোট Order Item: বামে সাদা ছোট ছবির বাক্স, নাম, নিচে ফাইল/সাইজ, নিচে দাম এবং ডানে Quantity; কোণায় Remove। Cart ও Checkout একই component ব্যবহার করে।
২. Cart Checkout-এ Edit cart; সরাসরি Order Checkout-এ Edit item দিয়ে একই Row-এর Control-এ যায়।
৩. App-এর Surface Shadow একই হালকা মান; Packaging-এ Shadow যোগ হয়নি।
৪. Total Bill-এ Apply a promo code Row; চাপলে Input ও Apply খুলবে। সফল ছাড় Bill ও Order Total-এ যোগ হয়। Server-এ মূল্য, মেয়াদ ও ব্যবহার সীমা যাচাই হয়।
৫. Doctor-এর দুই কলামের ছোট Card → আলাদা Profile। ছবিসহ পরিচিতি, অভিজ্ঞতা, BMDC ও কর্মস্থল/চেম্বার, তথ্য/অভিজ্ঞতা/রিভিউ/ক্লিপস চারটি Tabs; Rating নেই। Profile-এর উপরে Heart/Share এবং নিচে Fee/Booking Bar। কেবল Admin-দেওয়া তথ্য দেখায়; বানানো রেটিং বা তথ্য নেই।
৬. ফোন ও সরাসরি পরামর্শের পৃথক Price/Free, সরাসরি Schedule, বুকিংয়ে নির্বাচিত ধরন ও Server-নির্ধারিত Fee। সরাসরি দেখানোর Fee খালি থাকলে বুক করা যায় না।
৭. Admin-এর Patient Booking ছোট সারি; খুললে রোগীর বিস্তারিত, সময়, Status, Verified Payment ও Note Edit করা যায়।
৮. Admin-এর দুটি আলাদা Menu → Navigation Editor ও Profile Menu Editor: বাংলা/ইংরেজি নাম, Icon, Page/https Link, Show/Hide, Order, Delete, Add ও Defaults Restore। New Menu নিজে নতুন Page তৈরি করে না। বেশি Navigation Item হলে Scroll করা যায়।
৯. Navigation Uploaded Icon স্বাভাবিক অবস্থায় কালো ও Active অবস্থায় সাদা। অন্য Icon-এর Uploaded Colour অক্ষুণ্ণ।

কীভাবে বসাবেন
১. ZIP Extract করুন।
২. GitHub Project Root-এ src ও supabase ফোল্ডারের Matching Files Replace করে Commit করুন। পুরো src মুছবেন না; এই ZIP-এ বদলানো ফাইলগুলো আছে।
৩. Supabase SQL Editor-এ RUN-THIS-UPDATE.sql-এর পুরো লেখা দিয়ে Run করুন। এতে আগের Offer/Promo SQL এবং নতুন Doctor/Menu SQL আছে; আবার Run করা যায়। আগের Doctor Booking ও app_ui_settings Tables থাকতে হবে।
৪. Lovable Preview Update করে Publish/Update করুন। Live Web Refresh করুন।
৫. Admin → Doctor: প্রতিটি Doctor-এর Phone Fee/Free, In-person Fee/Free, দুই ভাষার Schedule এবং Profile তথ্য Save করুন।
৬. Admin-এর আলাদা Navigation Editor অথবা Profile Menu Editor খুলে Edit করে Save করুন। এক Editor-এর পরিবর্তন Save না করে অন্য Tab-এ গেলে বাদ দেওয়ার Confirm দেখাবে।
৭. Checkout → Total Bill → প্রোমো কোড ব্যবহার করুন → RIYAD01 লিখে Apply করে দেখুন। Coupon Enabled, Minimum, Expiry ও Usage Limit প্রযোজ্য; ব্যবহারের সীমা শেষ হলে নতুন বৈধ Code দরকার।
৮. পুরোনো APK-তে এই Code পৌঁছাতে সর্বশেষ Source নিয়ে android:sync করে নতুন APK Build/Install করতে হবে। এই ZIP APK নয়।

যাচাই
TypeScript ও Android Web Production Build পাস। SQL পরীক্ষা: দুই Mode-এর Fee, দুই Mode-এর Free, Login, Invalid Mode, SQL Rerun এবং Promo Discount/Limit/Server Validation পাস। Menu Destination Validation পাস।
এই Checkout Input UI উপস্থিত আছে; আগের বাদ যাওয়া Promo Input সংশোধন অন্তর্ভুক্ত।
এখানে সাধারণ npm run build এই উদ্ধার করা Project-এর index.html না থাকায় চলেনি; Android Web Build চলেছে।
Live Deployment এবং বাস্তব Phone Visual Test করা হয়নি। এই ZIP Push Notification বা Payment Gateway Integration-এর নতুন Fix নয়। Doctor-এর Free Call চালু; Paid Call-এর আগে Admin-Verified Payment প্রয়োজন। Booking সময় রোগীর Request; Admin Confirm/Reschedule করে, Schedule Text থেকে স্বয়ংক্রিয় Slot Lock তৈরি হয় না।

৯:৪৬-এর সংশোধন
Doctor Profile রেফারেন্সের কাঠামো: Photo + availability, Name/Degree/Specialty Ribbon, Experience ও BMDC (Rating বাদ), Workplace, চারটি Tabs, Schedule এবং দুই কলামের Fee/Follow-up/Patients Seen/Joined/Doctor Code/Average Duration Panel। নিচে Fixed Fee + Booking Bar।
Admin → Doctor থেকে Availability, Follow-up Fee/Days, প্রকৃত Patients Seen, Join Date, Code ও Average Duration লিখবেন। ফাঁকা তথ্য — দেখায়; বানানো পরিসংখ্যান নেই। Doctor-এর নিচে Review ও Clips Editor আছে। Actual Review লেখা/ছবি/Video এবং Hosted MP4/YouTube Clips Link দেওয়া যায়।
Doctor-এর Heart এই Browser/Device-এ সংরক্ষণ হয়; Share বর্তমান Profile Link শেয়ার করে।
আগের ZIP Upload করে থাকলে এই সংশোধিত ZIP-এর Matching src/supabase Files আবার Replace করে Commit করুন। নতুন Doctor Fields-এর জন্য RUN-THIS-UPDATE.sql আবার Run করুন, তারপর Publish/Update করুন। SQL আবার Run করা যায়।
প্রকৃত ফোনে Layout এখনও যাচাই করা হয়নি; রেফারেন্সের কাঠামো অনুসারে বাস্তবায়ন করা হয়েছে।
