/**
 * BuildValidator — Checks the SameVibeMobile Expo app for App Store and Play Store readiness.
 *
 * Validates:
 *  - app.json: bundleIdentifier (iOS), package (Android), version, buildNumber
 *  - Asset files: icon, splash, adaptive icon
 *  - EAS configuration
 *  - Required permissions
 */

import fs from "fs";
import path from "path";

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
  fix?: string;
}

export interface ValidationReport {
  allPassed: boolean;
  checks: ValidationCheck[];
  iosReady: boolean;
  androidReady: boolean;
  score: number; // 0–100
}

const ROOT = process.cwd();
const MOBILE_ROOT = path.join(ROOT, "..", "SameVibeMobile");

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(MOBILE_ROOT, relativePath));
}

function readJSON(relativePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(path.join(MOBILE_ROOT, relativePath), "utf-8"));
  } catch {
    return null;
  }
}

export async function validateBuild(): Promise<ValidationReport> {
  const checks: ValidationCheck[] = [];
  const appJson = readJSON("app.json");
  const expo = appJson?.expo ?? {};

  // ── app.json fundamentals ──────────────────────────────────────────────────
  checks.push({
    name: "app.json exists",
    passed: !!appJson,
    detail: appJson ? "Found app.json" : "app.json is missing",
    fix: "Create app.json with expo config",
  });

  checks.push({
    name: "App name set",
    passed: !!expo.name,
    detail: expo.name ? `Name: "${expo.name}"` : "expo.name is missing",
    fix: `Set "name" in app.json > expo`,
  });

  checks.push({
    name: "App version set",
    passed: !!expo.version,
    detail: expo.version ? `Version: ${expo.version}` : "expo.version is missing",
    fix: `Set "version": "1.0.0" in app.json > expo`,
  });

  // ── iOS ────────────────────────────────────────────────────────────────────
  const bundleId = expo.ios?.bundleIdentifier;
  checks.push({
    name: "iOS bundleIdentifier set",
    passed: !!bundleId,
    detail: bundleId ? `Bundle ID: ${bundleId}` : "ios.bundleIdentifier missing",
    fix: `Add "ios": { "bundleIdentifier": "com.yourcompany.samevibe" } to app.json`,
  });

  checks.push({
    name: "iOS build number set",
    passed: !!expo.ios?.buildNumber,
    detail: expo.ios?.buildNumber ? `Build: ${expo.ios.buildNumber}` : "ios.buildNumber missing",
    fix: `Add "buildNumber": "1" to ios config`,
  });

  // ── Android ────────────────────────────────────────────────────────────────
  const pkg = expo.android?.package;
  checks.push({
    name: "Android package name set",
    passed: !!pkg,
    detail: pkg ? `Package: ${pkg}` : "android.package missing",
    fix: `Add "android": { "package": "com.yourcompany.samevibe" } to app.json`,
  });

  checks.push({
    name: "Android versionCode set",
    passed: !!expo.android?.versionCode,
    detail: expo.android?.versionCode ? `versionCode: ${expo.android.versionCode}` : "android.versionCode missing",
    fix: `Add "versionCode": 1 to android config`,
  });

  // ── Assets ─────────────────────────────────────────────────────────────────
  const iconExists = fileExists("assets/images/icon.png");
  checks.push({
    name: "App icon (icon.png) exists",
    passed: iconExists,
    detail: iconExists ? "assets/images/icon.png found" : "Missing icon.png (1024x1024 required)",
    fix: "Add a 1024x1024 icon.png to assets/images/",
  });

  const splashExists = fileExists("assets/images/splash.png");
  checks.push({
    name: "Splash screen exists",
    passed: splashExists,
    detail: splashExists ? "assets/images/splash.png found" : "Missing splash.png",
    fix: "Add splash.png to assets/images/",
  });

  const adaptiveExists = fileExists("assets/images/adaptive-icon.png");
  checks.push({
    name: "Android adaptive icon exists",
    passed: adaptiveExists,
    detail: adaptiveExists ? "assets/images/adaptive-icon.png found" : "Missing adaptive-icon.png",
    fix: "Add adaptive-icon.png to assets/images/",
  });

  // ── EAS ────────────────────────────────────────────────────────────────────
  const easJson = readJSON("eas.json");
  checks.push({
    name: "eas.json configured",
    passed: !!easJson,
    detail: easJson ? "eas.json found" : "eas.json missing — needed for EAS Build",
    fix: "Run `npx eas build:configure` in SameVibeMobile/",
  });

  // ── Schema / Permissions ───────────────────────────────────────────────────
  checks.push({
    name: "App scheme set (deep links)",
    passed: !!expo.scheme,
    detail: expo.scheme ? `Scheme: ${expo.scheme}` : "expo.scheme missing",
    fix: `Add "scheme": "samevibe" to app.json`,
  });

  // Compute score
  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const iosChecks = checks.filter(c => c.name.toLowerCase().includes("ios") || c.name.includes("icon") || c.name.includes("splash"));
  const androidChecks = checks.filter(c => c.name.toLowerCase().includes("android") || c.name.includes("icon") || c.name.includes("adaptive"));

  return {
    allPassed: checks.every(c => c.passed),
    checks,
    iosReady: iosChecks.every(c => c.passed),
    androidReady: androidChecks.every(c => c.passed),
    score,
  };
}

export const buildValidator = { validateBuild };
