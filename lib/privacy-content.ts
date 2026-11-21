export const PRIVACY_CONTACT = {
  name: "Ecory",
  address: "Jashore Sadar, Jashore, Khulna, Bangladesh",
  addressBn: "যশোর সদর, যশোর, খুলনা, বাংলাদেশ",
  email: "ecorybd@gmail.com",
} as const;

export const PRIVACY_SECTIONS: Record<"bn" | "en", [string, string][]> = {
  bn: [
    [
      "আমাদের পরিচয় ও যোগাযোগ",
      "এই নীতি Ecory অ্যাপ ও ওয়েবসাইটের জন্য প্রযোজ্য। ঠিকানা: যশোর সদর, যশোর, খুলনা, বাংলাদেশ। গোপনীয়তা ও তথ্য মুছে দেওয়ার যোগাযোগ: ecorybd@gmail.com। হালনাগাদ: ১৮ অক্টোবর ২০২৬।",
    ],
    [
      "অ্যাকাউন্ট ও অর্ডারের তথ্য",
      "আপনি যে সুবিধা ব্যবহার করেন সে অনুযায়ী নাম, ইমেইল বা ফোন, প্রোফাইল ছবি, সংরক্ষিত ঠিকানা, পছন্দের পণ্য, অর্ডারের পণ্য ও মূল্য, ডেলিভারি এবং পেমেন্টের রেফারেন্স প্রক্রিয়া করা হয়। সহায়তার জন্য আপনার পাঠানো তথ্যও ব্যবহৃত হয়।",
    ],
    [
      "ডাক্তার বুকিং ও স্বাস্থ্যতথ্য",
      "ডাক্তার বুকিংয়ের ফর্মে দেওয়া রোগীর পরিচয়, যোগাযোগ, বয়স বা অন্যান্য বিবরণ, সমস্যার বিবরণ, পরামর্শের ধরন ও বুকিংয়ের অবস্থা সংরক্ষণ করা হতে পারে। বুকিং পরিচালনার জন্য প্রয়োজনীয় তথ্য দায়িত্বপ্রাপ্ত কর্মী ও সংশ্লিষ্ট চিকিৎসক ব্যবহার করেন। প্রয়োজনের অতিরিক্ত সংবেদনশীল তথ্য দেবেন না।",
    ],
    [
      "স্পিন, পুরস্কার ও কুপন",
      "স্পিনে দেওয়া নাম, ফোন, পুরস্কার, কুপন ও ব্যবহার-সংক্রান্ত রেকর্ড রাখা হয়। পুনরাবৃত্ত অংশগ্রহণ প্রতিরোধ ও account-এ পুরস্কার যুক্ত করতে browser claim token এবং তার server-side যাচাইয়ের রেকর্ড ব্যবহৃত হয়।",
    ],
    [
      "ডিভাইস, স্থানীয় সংরক্ষণ ও notification",
      "লগইন সচল রাখা, কার্ট, favourites, ভাষা, spin ও notification preference-এর জন্য local/session storage ব্যবহার করা হয়। Notification চালু করলে Firebase Cloud Messaging ও আমাদের backend push token ও device identifier প্রক্রিয়া করে। Service provider নিরাপত্তা ও পরিচালনার জন্য IP address, সময় ও প্রযুক্তিগত লগ রাখতে পারে। ফোনের Settings থেকে notification বন্ধ করতে পারেন।",
    ],
    [
      "কেন তথ্য ব্যবহার করা হয়",
      "অ্যাকাউন্ট পরিচালনা, অর্ডার ও ডেলিভারি, পেমেন্ট যাচাই, ডাক্তার বুকিং, কুপন, customer support, নিরাপত্তা ও অপব্যবহার প্রতিরোধের জন্য তথ্য ব্যবহার করা হয়। অনুমতি দিলে offer ও health tips notification পাঠানো হয়।",
    ],
    [
      "কারা তথ্য প্রক্রিয়া করে",
      "দায়িত্বপ্রাপ্ত Ecory কর্মী এবং প্রয়োজন অনুযায়ী courier, সংশ্লিষ্ট চিকিৎসক, payment processor ও hosting/database/notification service provider প্রয়োজনীয় তথ্য প্রক্রিয়া করেন। বর্তমান অ্যাপে Supabase/Lovable Cloud ও Firebase-এর সেবা ব্যবহৃত হয়। Call, WhatsApp বা অন্য বাহ্যিক সেবা ব্যবহার করলে তাদের নিজস্ব নীতি প্রযোজ্য। প্রযোজ্য আইনগত প্রয়োজনেও তথ্য প্রকাশ করা হতে পারে।",
    ],
    [
      "পেমেন্ট ও নিরাপত্তা",
      "অর্ডারের সঙ্গে payment reference ও status রাখা হতে পারে। Gateway চালু থাকলে তার নিরাপদ পেজে payment সম্পন্ন হয়। Ecory-কে bKash PIN, payment OTP বা সম্পূর্ণ card তথ্য দেবেন না। তথ্য পরিবহনে HTTPS ও access control ব্যবহৃত হয়; কোনো অনলাইন ব্যবস্থাকে সম্পূর্ণ ঝুঁকিমুক্ত বলা যায় না।",
    ],
    [
      "তথ্য সংরক্ষণ ও মুছে দেওয়া",
      "সেবা ও account পরিচালনার প্রয়োজন পর্যন্ত তথ্য রাখা হয়। Deletion request-এর পর মালিকানা যাচাই করে account ও সংশ্লিষ্ট ব্যক্তিগত তথ্য মুছে দেওয়া বা পরিচয়বিহীন করার প্রক্রিয়া নেওয়া হয়। চলমান লেনদেন, হিসাব, বিরোধ, নিরাপত্তা বা প্রযোজ্য আইনের কারণে সীমিত রেকর্ড রাখতে হলে support কারণ ও প্রযোজ্য সময় জানাবে। Backup ও service-provider logs তাদের সংশ্লিষ্ট retention/deletion প্রক্রিয়ার অধীন।",
    ],
    [
      "আপনার পছন্দ ও আবেদন",
      "Profile থেকে তথ্য সম্পাদনা করতে পারেন। তথ্য দেখা, সংশোধন বা account ও data মুছে দেওয়ার জন্য নিচের পেজ ব্যবহার করুন বা ecorybd@gmail.com-এ লিখুন। অ্যাপ পুনরায় install বা login না করেও ওয়েব থেকে deletion request করা যায়। Logout বা uninstall করলে server-এর account নিজে থেকে মুছে যায় না। ইমেইলে আবেদন পাঠানোর পর support মালিকানা যাচাই, পরবর্তী ধাপ ও completion জানাবে; এই পেজে automatic deletion হয় না।",
    ],
    [
      "শিশু ও নীতির পরিবর্তন",
      "এই অ্যাপ শিশুদের উদ্দেশ্যে তৈরি নয়। কোনো শিশুর তথ্য অনিচ্ছাকৃতভাবে জমা হয়েছে মনে হলে যোগাযোগ করুন। অ্যাপের সুবিধা বা তথ্য ব্যবহারের ধরন বদলালে এই নীতি হালনাগাদ করা হবে।",
    ],
  ],
  en: [
    [
      "Who we are and contact",
      "This policy applies to the Ecory app and website. Address: Jashore Sadar, Jashore, Khulna, Bangladesh. Privacy and data-deletion contact: ecorybd@gmail.com. Updated: 18 October 2026.",
    ],
    [
      "Accounts and orders",
      "Depending on the features you use, we process names, email addresses or phone numbers, profile photos, saved addresses, favourites, order items and amounts, delivery details and payment references. Information you send for support is also processed.",
    ],
    [
      "Doctor bookings and health information",
      "We may store patient identity, contact details, age or other details entered into booking forms, problem descriptions, consultation types and booking status. Authorized staff and the relevant doctor use necessary information to manage bookings. Do not provide unnecessary sensitive information.",
    ],
    [
      "Spin rewards and coupons",
      "Spin records include the name and phone supplied, rewards, coupons and redemption information. A browser claim token and its verifiable server record help prevent repeat participation and attach rewards to an account.",
    ],
    [
      "Devices, local storage and notifications",
      "Local/session storage supports login, cart, favourites, language, spin and notification preferences. When enabled, Firebase Cloud Messaging and our backend process push tokens and device identifiers. Service providers may process IP addresses, timestamps and technical logs for security and operations. Notifications can be disabled in phone settings.",
    ],
    [
      "Why information is used",
      "Information supports accounts, orders, delivery, payment verification, doctor bookings, coupons, customer support, security and abuse prevention. With permission, we send offer and health-tip notifications.",
    ],
    [
      "Who processes information",
      "Authorized Ecory staff and, as needed, couriers, relevant doctors, payment processors and hosting/database/notification providers process necessary information. The current app uses Supabase/Lovable Cloud and Firebase services. External call, WhatsApp and other services apply their own policies. Information may also be disclosed for applicable legal requirements.",
    ],
    [
      "Payments and security",
      "Payment references and status may be linked to orders. Enabled gateways complete payment on their secure pages. Do not give Ecory your bKash PIN, payment OTP or full card details. HTTPS and access controls protect information, but no online system is entirely risk-free.",
    ],
    [
      "Retention and deletion",
      "Information is retained as needed to provide services and operate accounts. After a deletion request and ownership verification, we process account deletion and deletion or de-identification of associated personal information. If limited records are required for ongoing transactions, accounting, disputes, security or applicable law, support explains why and the applicable period. Backups and provider logs remain subject to their retention/deletion processes.",
    ],
    [
      "Your choices and requests",
      "You can edit profile information. To request access, correction or account and data deletion, use the page below or email ecorybd@gmail.com. The web request page works without reinstalling the app or logging in. Uninstalling or logging out does not delete the server account. After you send your email, support explains ownership verification, next steps and completion; this page does not automatically delete accounts.",
    ],
    [
      "Children and updates",
      "The app is not directed at children. Contact us if you believe a child supplied information unintentionally. We update this policy when features or data practices change.",
    ],
  ],
};

export function deletionEmail(name: string, identity: string, notes: string) {
  const body = [
    "I request deletion of my Ecory account and associated personal data.",
    `Name: ${name.trim()}`,
    `Registered email or phone: ${identity.trim()}`,
    notes.trim() ? `Additional information: ${notes.trim()}` : "",
    "Please verify my ownership and confirm deletion, including any records that must be retained and why.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    body,
    href: `mailto:${PRIVACY_CONTACT.email}?subject=${encodeURIComponent("Ecory account and data deletion request")}&body=${encodeURIComponent(body)}`,
  };
}
