# iOS Release and Native Build Audit

**Confidence Level:** High
**Total Findings:** 6

## 1. Missing Entitlements for Push Notifications and Sign in with Apple
- **File:** `ios/App/App.xcodeproj/project.pbxproj`
- **Line:** Entire file
- **Code Path:** PBXProject section
- **Affected Feature:** Push Notifications, Apple Sign-In (`CapacitorPushNotifications`, `CapacitorFirebaseAuthentication` with Apple provider)
- **Reviewer-Visible Path:** TestFlight upload rejection or silent runtime failure of Push and Apple Sign-In.
- **Static Evidence:** `project.pbxproj` has no `CODE_SIGN_ENTITLEMENTS` setting and no `.entitlements` file exists in `ios/App/App`.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** Xcode project lacks required capabilities.
- **Confidence:** High
- **Severity:** PROVEN DEFECT
- **Applies to:** Both (Probable TestFlight Baseline 7a730ffd and Proposed Local Candidate b905e09)
- **Smallest Proposed Correction:** Open the iOS project in Xcode, go to the App target -> Signing & Capabilities, and add "Push Notifications" and "Sign In with Apple". This will automatically generate `App/App.entitlements` and link it.

## 2. Missing In-App Purchase Capability
- **File:** `ios/App/App.xcodeproj/project.pbxproj`
- **Line:** Entire file
- **Code Path:** PBXProject section
- **Affected Feature:** RevenueCat In-App Subscriptions
- **Reviewer-Visible Path:** In-app purchases fail to load products or complete transactions.
- **Static Evidence:** No In-App Purchase capability is added to the Xcode project.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** Xcode project lacks required capabilities for StoreKit to operate properly.
- **Confidence:** High
- **Severity:** PROVEN DEFECT
- **Applies to:** Both
- **Smallest Proposed Correction:** Open the iOS project in Xcode, go to the App target -> Signing & Capabilities, and add "In-App Purchase".

## 3. iOS Deployment Target Outdated for Capacitor 6
- **File:** `ios/App/Podfile` and `ios/App/App.xcodeproj/project.pbxproj`
- **Line:** Line 3 (Podfile), Line 289, 340, 356, 376 (project.pbxproj)
- **Code Path:** `platform :ios, '13.0'` and `IPHONEOS_DEPLOYMENT_TARGET = 13.0;`
- **Affected Feature:** Native Build Compilation
- **Reviewer-Visible Path:** Build failure on Codemagic due to Capacitor 6 requiring iOS 14.0+.
- **Static Evidence:** The deployment target is set to 13.0, but Capacitor 6 requires iOS 14.0 minimum.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** Podfile platform declaration.
- **Confidence:** Medium
- **Severity:** STRONGLY SUPPORTED RISK
- **Applies to:** Both
- **Smallest Proposed Correction:** Change `platform :ios, '13.0'` to `platform :ios, '14.0'` in `ios/App/Podfile`, and update `IPHONEOS_DEPLOYMENT_TARGET` to `14.0` in `project.pbxproj`.

## 4. Proper Viewport Sizing (Dynamic Viewport Height)
- **File:** `client/src/index.css` and multiple `client/src/pages/*.tsx` files
- **Line:** Multiple
- **Code Path:** CSS properties and Tailwind classes
- **Affected Feature:** Mobile layout
- **Reviewer-Visible Path:** Layout fits within the screen correctly without being cut off by Safari's address bar.
- **Static Evidence:** Extensively uses `100dvh` (e.g. `min-h-[100dvh]`). No instances of raw `100vh` or `h-screen`.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** High
- **Severity:** SAFE
- **Applies to:** Both
- **Smallest Proposed Correction:** None needed.

## 5. Proper Safe Area Handling
- **File:** `client/src/index.css` and `client/src/components/layout/mobile-nav.tsx`
- **Line:** 77-86 in `index.css`, 70 in `mobile-nav.tsx`
- **Code Path:** CSS environment variables
- **Affected Feature:** App padding around notches and home indicators
- **Reviewer-Visible Path:** Content is not occluded by iOS hardware UI elements.
- **Static Evidence:** Core CSS correctly implements `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** High
- **Severity:** SAFE
- **Applies to:** Both
- **Smallest Proposed Correction:** None needed.

## 6. Codemagic Build Number Handling
- **File:** `codemagic.yaml`
- **Line:** 80
- **Code Path:** `sed -i '' "s/CURRENT_PROJECT_VERSION = .*/CURRENT_PROJECT_VERSION = $BUILD_NUMBER;/g" ios/App/App.xcodeproj/project.pbxproj`
- **Affected Feature:** TestFlight / App Store Connect versioning
- **Reviewer-Visible Path:** Successful upload of subsequent builds without "redundant build number" errors.
- **Static Evidence:** Script dynamically increments Xcode build number based on Codemagic run ID.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** High
- **Severity:** SAFE
- **Applies to:** Both
- **Smallest Proposed Correction:** None needed.
