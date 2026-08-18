/**
 * useOtaUpdate — SameVibe Over-The-Air Update Hook
 * ─────────────────────────────────────────────────────────
 * Polls /api/app/version on every app foreground resume.
 * On native (Capacitor), if the buildHash has changed it means
 * Vercel has a new deployment — the WebView reloads to pick it up.
 *
 * This means bug fixes ship to users within 2 minutes of a push
 * to main — no App Store re-submission required.
 *
 * On web, it uses the existing service worker update mechanism.
 */

import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes on web
const STORAGE_KEY = "samevibe_bundle_hash";
const FORCE_UPDATE_KEY = "samevibe_force_update_seen";

interface VersionInfo {
  version: string;
  buildHash: string;
  forceUpdate: boolean;
  forceUpdateMessage: string;
}

export function useOtaUpdate() {
  const { toast } = useToast();
  const currentHashRef = useRef<string | null>(null);
  const checkInProgress = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  const checkForUpdate = useCallback(async (silent = true) => {
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      const res = await fetch(getApiUrl("/api/app/version"));
      if (!res.ok) return;

      const info: VersionInfo = await res.json();

      if (info.forceUpdate) {
        const lastSeen = sessionStorage.getItem(FORCE_UPDATE_KEY);
        if (lastSeen !== info.buildHash) {
          sessionStorage.setItem(FORCE_UPDATE_KEY, info.buildHash);
          toast({
            title: "Critical Update Required",
            description: info.forceUpdateMessage || "Please restart the app to continue.",
          });
          if (isNative) {
            setTimeout(() => window.location.reload(), 3000);
          }
        }
        return;
      }

      const lastHash = localStorage.getItem(STORAGE_KEY);

      if (!lastHash) {
        localStorage.setItem(STORAGE_KEY, info.buildHash);
        currentHashRef.current = info.buildHash;
        return;
      }

      if (lastHash !== info.buildHash) {
        console.log(`[OTA] New build detected: ${lastHash} → ${info.buildHash}`);
        localStorage.setItem(STORAGE_KEY, info.buildHash);

        if (isNative) {
          if (!silent) {
            toast({
              title: "App Updated ✨",
              description: "SameVibe has been updated with the latest improvements.",
            });
          }
          setTimeout(() => window.location.reload(), silent ? 100 : 2500);
        } else {
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
            }
          }
        }
      }
    } catch {
      // Fail silently for network blips
    } finally {
      checkInProgress.current = false;
    }
  }, [isNative, toast]);

  useEffect(() => {
    // If running inside native Capacitor app loading an old local bundle,
    // transition native container to live production server for instant updates.
    if (isNative && typeof window !== "undefined" && window.location.hostname !== "samevibe-sandy.vercel.app" && !window.location.hostname.includes("localhost")) {
      const targetUrl = `https://samevibe-sandy.vercel.app${window.location.pathname}${window.location.search}`;
      console.log(`[OTA] Transitioning native app to live production: ${targetUrl}`);
      window.location.href = targetUrl;
      return;
    }

    checkForUpdate(true);

    if (isNative) {
      let appStateListener: any;
      import("@capacitor/app" as string)
        .then(({ App }) => {
          App.addListener("appStateChange", ({ isActive }: { isActive: boolean }) => {
            if (isActive) {
              checkForUpdate(true);
            }
          }).then((listener: any) => {
            appStateListener = listener;
          });
        })
        .catch(() => {});

      return () => {
        appStateListener?.remove();
      };
    } else {
      const interval = setInterval(() => checkForUpdate(true), CHECK_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [checkForUpdate, isNative]);

  return { checkForUpdate };
}
