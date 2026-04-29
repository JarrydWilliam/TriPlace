# TriPlace — App Store Submission Guide

## App Metadata

| Field | Value |
|-------|-------|
| **App Name** | TriPlace |
| **Subtitle** | Your Community, Your Third Place |
| **Bundle ID (iOS)** | com.triplace.app |
| **Package Name (Android)** | com.triplace.app |
| **Version** | 1.0.0 |
| **Build** | 1 |
| **Category** | Social Networking |
| **Secondary Category** | Lifestyle |
| **Age Rating** | 12+ |
| **Content Rating (Google)** | Teen |
| **Privacy URL** | https://triplace.app/privacy |
| **Support URL** | https://triplace.app/support |
| **Marketing URL** | https://triplace.app |

---

## App Store Description (Apple)

**Short Description** (30 chars):
> Find your community

**Full Description** (max 4000 chars):
```
TriPlace helps you find your people — the real ones who share your passions, live nearby, and are ready to show up.

Answer a few quick questions about your interests, and our AI instantly reveals the communities you belong in. Not random groups. Your people.

🌟 THE FAMILIAR BUT NEW EXPERIENCE
We take the social apps you already know — the feeds, the chats, the events — and make them actually meaningful. TriPlace feels instantly familiar, but the people and places it connects you to feel completely new.

🤖 AI-POWERED COMMUNITY MATCHING
Our AI reads your interests, location, and vibe to match you with local communities that genuinely fit. The more you engage, the better it knows you.

📍 YOUR CITY, YOUR COMMUNITIES
Join up to 5 active communities. Each one is a living space with real conversations, local events, and people who actually show up. Can't find your vibe? The AI keeps rotating new communities into your feed.

🎉 REAL EVENTS, REAL CONNECTIONS
Discover events happening nearby — from tech meetups to outdoor adventures to arts workshops. Every "Get tickets" link goes straight to the original source. No in-app purchasing. No gimmicks. Just the event.

💜 KUDOS CULTURE
Celebrate the people in your communities. Give kudos for great contributions, meaningful connections, and showing up. Build your local reputation.

🔒 PRIVACY FIRST
We collect only what we need to match you with your community. You can delete your account and all associated data at any time, instantly. We disclose all AI providers we use in our privacy policy.

TriPlace is built for people who believe that the best conversations — and the best connections — happen in person.

Find your third place.
```

---

## Google Play Description

**Short Description** (80 chars):
> AI-powered community discovery. Find your people, your places, your next move.

**Full Description**: *(same as Apple, Google allows up to 4000 chars)*

---

## Keywords (Apple App Store)

```
community, social, local events, meetups, find friends, AI matching, 
third place, neighborhood, interest groups, real connections
```

---

## App Review Notes (Apple)

> TriPlace indexes publicly available event listings and redirects users to the original source for full details or ticketing. The app does not sell tickets, collect event payments, or replace the source website's transaction flow. Event content is attribution-based and limited to public metadata such as title, date, time, venue, and source link.
>
> For paid event content, users are redirected to the original provider (e.g., Eventbrite, Meetup, venue website). No in-app payments for events are processed.
>
> The app uses Firebase Authentication for Google Sign-In. On iOS, this uses signInWithRedirect (not popup) as required for WKWebView compatibility.
>
> Test credentials are not required — the app supports Google Sign-In via the test account below, or users can create a new account via email.
>
> **Demo account**: triplace.demo@gmail.com / [set up a demo Google account]

---

## Screenshots Required

### iPhone (6.9" — iPhone 16 Pro Max)
1. Onboarding quiz screen — "What's your vibe?"
2. Cinematic reveal — "Here are your people"
3. Dashboard with community cards
4. Discover page with AI-matched communities
5. Community chat / conversation
6. Event card with external link

### iPad (if submitting)
- Same 6 screens scaled to iPad layout

### Android (Phone 16:9 or 9:16)
- Same 6 screens on Android

---

## Required Assets

| Asset | Size | Status |
|-------|------|--------|
| App Icon (iOS) | 1024×1024 PNG, no alpha | ⚠️ Need to generate |
| App Icon (Android) | 512×512 PNG | ⚠️ Need to generate |
| Splash Screen | 2732×2732 (iOS), 1080×1920 (Android) | ⚠️ Need to generate |
| Feature Graphic (Google Play) | 1024×500 | ⚠️ Need to generate |
| OG Image | 1200×630 | ✅ `/client/public/og-image.jpg` |

---

## Pre-Submission Checklist

- [ ] Firebase project configured for production domain `triplace.app`
- [ ] Firebase OAuth redirect domains updated to include `triplace.app`
- [ ] All VITE_FIREBASE_* env vars set in Codemagic
- [ ] OPENAI_API_KEY set in Codemagic
- [ ] DATABASE_URL (Neon) set in Codemagic
- [ ] App icon (1024x1024) added to Xcode / Android res
- [ ] Splash screen assets added
- [ ] `npx cap add ios` run (creates `ios/` folder)
- [ ] `npx cap add android` run (creates `android/` folder)
- [ ] `npx cap sync` run after every web build
- [ ] iOS provisioning profile created in Apple Developer Console
- [ ] Android keystore generated and stored in Codemagic secrets
- [ ] Privacy Policy accessible at `https://triplace.app/privacy`
- [ ] Terms of Service accessible at `https://triplace.app/terms`
- [ ] Support email set up (e.g. support@triplace.app)
- [ ] App Store Connect app record created (com.triplace.app)
- [ ] Google Play Console app record created (com.triplace.app)

---

## CI/CD Steps (After Node.js Is Available)

```bash
# 1. Install dependencies
npm install

# 2. Add Capacitor platforms (first time only)
npx cap add ios
npx cap add android

# 3. Build web bundle
npm run build

# 4. Sync to native
npx cap sync

# 5. Open in Xcode (Mac only) or push to Codemagic for CI build
npx cap open ios

# 6. Open in Android Studio or push to Codemagic
npx cap open android
```

---

## Codemagic Setup

1. Connect GitHub repo at https://codemagic.io
2. Select `codemagic.yaml` as the build config
3. Create environment variable groups:
   - `triplace_env`: all VITE_FIREBASE_* + OPENAI_API_KEY + DATABASE_URL
   - `triplace_android_keystore`: KEYSTORE_BASE64, KEY_ALIAS, KEY_PASSWORD, STORE_PASSWORD
4. Add Apple Developer account in Codemagic integrations
5. Enable automatic TestFlight distribution
6. Enable automatic Google Play (internal track) distribution
