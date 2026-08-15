# SameVibe ProGuard / R8 rules
# Required because minifyEnabled=true is set for the release build.
# Without these rules R8 would strip classes needed at runtime.

# ── Capacitor WebView JavaScript Bridge ──────────────────────────────────────
# Capacitor plugins communicate via WebView JS Bridge — keep all public members
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# ── Firebase / Google Play Services ──────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── RevenueCat Purchases SDK ─────────────────────────────────────────────────
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# ── CapAwesome Firebase Auth Optional Providers ──────────────────────────────
-dontwarn com.facebook.**
-dontwarn com.twitter.**
-dontwarn com.amazon.**
-dontwarn com.amazon.device.**
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.**

# ── Keep source line numbers in crash reports (Crashlytics-friendly) ─────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── General safety for serialized model classes ───────────────────────────────
-keepattributes *Annotation*
-keepattributes Signature

