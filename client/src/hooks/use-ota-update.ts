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
import { App } from "@capacitor/app";
import { useToast } from "@/hooks/use-toast";

const VERSION_URL = "https://samevibe-sandy.vercel.app/api/app/version";
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
  const isNative = Capacitor.isNativePlatform();
  const checkInProgress = useRef(false);

  const checkForUpdate = useCallback(async (silent = true) => {
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      const res = await fetch(VERSION_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return;

      const info: VersionInfo = await res.json();

      // ── Force update (critical fix) ───────────────────────────────────────
      if (info.forceUpdate) {
        const lastSeen = sessionStorage.getItem(FORCE_UPDATE_KEY);
        if (lastSeen !== info.buildHash) {
          sessionStorage.setItem(FORCE_UPDATE_KEY, info.buildHash);
          toast({
            title: "Critical Update Required",
            description: info.forceUpdateMessage || "Please restart the app to continue.",
            duration: 0, // Don't auto-dismiss
          });
          // On native, reload the WebView immediately
          if (isNative) {
            setTimeout(() => window.location.reload(), 3000);
          }
        }
        return;
      }

      // ── Regular OTA update ────────────────────────────────────────────────
      const lastHash = localStorage.getItem(STORAGE_KEY);

      if (!lastHash) {
        // First run — just store the hash, no update needed
        localStorage.setItem(STORAGE_KEY, info.buildHash);
        return;
      }

      if (lastHash !== info.buildHash) {
        console.log(`[OTA] New build detected: ${lastHash} → ${info.buildHash}`);
        localStorage.setItem(STORAGE_KEY, info.buildHash);

        if (isNative) {
          // On native Capacitor: silently reload the WebView
          // The new bundle is already on Vercel — the WebView fetches fresh JS on reload
          if (!silent) {
            toast({
              title: "App Updated ✨",
              description: "SameVibe has been updated with the latest improvements.",
              duration: 3000,
            });
          }
          // Brief delay so the toast can show
          setTimeout(() => window.location.reload(), silent ? 100 : 2500);
        } else {
          // On web: trigger service worker update
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
            }
          }
        }
      }
    } catch {
      // Silent fail — network errors shouldn't disrupt the user
    } finally {
      checkInProgress.current = false;
    }
  }, [isNative, toast]);

  useEffect(() => {
    // Check immediately on mount (app launch)
    checkForUpdate(true);

    if (isNative) {
      // On native: check every time the app comes to the foreground
      let appStateListener: any;
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          checkForUpdate(true);
        }
      }).then(listener => {
        appStateListener = listener;
      });

      return () => {
        appStateListener?.remove();
      };
    } else {
      // On web: poll every 5 minutes
      const interval = setInterval(() => checkForUpdate(true), CHECK_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [checkForUpdate, isNative]);

  return { checkForUpdate };
}
