Android API 36 update (version 1.8, versionCode 9)

Upload the included android files to their matching paths in GitHub.
Do not delete other project files. No additional SQL is required for this Android update.
Requirements: JDK 17, Android SDK platform 36, Build Tools 35.0.0.
Gradle wrapper: 8.11.1; Android Gradle Plugin: 8.10.1.
After syncing web assets, build with ./gradlew assembleDebug (Windows: gradlew.bat assembleDebug).
The supplied APK is a debug build for phone testing.
For Google Play, a release AAB signed with your upload key is still required.
This update does not by itself fix FCM delivery or app performance issues.
System-bar/keyboard insets on Android 15/16 must be checked on a physical phone.

Startup fix: upload vite.android.config.ts and android-public-config.json too.
This JSON contains public Supabase connection values, not a service-role key.
Missing public configuration now stops Android builds.
