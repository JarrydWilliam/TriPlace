import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.triplace.app",
  appName: "TriPlace",
  webDir: "dist/public",
  bundledWebRuntime: false,
  // server block intentionally omitted for production.
  // For local dev with Capacitor: uncomment below and run `npx cap sync`
  // server: { url: "http://localhost:5000", cleartext: true },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f0e17",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default",
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0f0e17",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Geolocation: {
      // No extra config needed — uses native device GPS
    },
  },
  ios: {
    scheme: "TriPlace",
    contentInset: "always",
  },
  android: {
    allowMixedContent: false, // Must be false for Google Play compliance
    backgroundColor: "#0f0e17",
  },
};

export default config;
