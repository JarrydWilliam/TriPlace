# 📱 TriPlace App – README

## 🪄 Vision

TriPlace is your digital third place — a mobile-first platform that helps users discover interest-based communities, attend local events, and build real-world relationships. It blends AI-matching, geolocation, and a seamless UX to create meaningful social experiences.

---

## 🔐 Authentication Flow

* **First-time users**: Take a 15-question onboarding quiz
* **Returning users**: Login brings them straight to their personalized dashboard
* **Auth handled via Firebase**
* **Geolocation required** and must be accurate (drives event relevancy)

---

## 🏠 Dashboard

### Features:

* Shows 5 AI-matched communities
* Has a Discovery section
  * New communities that have been discovered for user based off events atteneded and quiz results
* Each community card includes:

  * Title
  * Live member previews
  * Cards sort with **least active** communities at the top
* Only show **real and currently online** members

### Design:

* Polished, elegant, modern
* Masculine-safe dark theme (not pure black)
* Rounded cards, smooth transitions, clean layout

---

## 👥 Communities

### 🧭 Top Banner (Header)

* ✅ Shows **community title** only
* 🔽 Expandable dropdown with:

  * Description
  * Rules
* ❌ No “Join” button (user is already a member)
* ❌ No events — they belong in the Events tab
* Pinnable Partner events relevant to the community the event is in. 

### 🗂️ Tabs (in order):

1. **Chat**
2. **Events**
3. **Members**
4. **Kudos**

### 🗨️ Chat Tab

* Real-time chat experience
* Clean, scrollable UI
* Pull-down to refresh (with high-end animations)
* Includes back button to return to the dashboard

### 📅 Events Tab

* ✅ Web-scraped events only ( relevant to the community the event is in )
* ✅ Sorted by date/time
* ✅ Includes partner-created pinned events
* ❌ No "Find Events" button (auto-generated)
* Events should be joinable 

### 👥 Members Tab

* Lists all community members
    * Real-time updates with filters
    * Status indicators with avatars
* Separates into:
  * 🟢 Online
  * ⚪ Offline

---

## 🌐 WebView / Mobile Shell

* Runs as mobile-optimized web app
* Wrapped inside React Native WebView
* WebView handles:

  * Mobile touch behavior
  * Context menu disabling
  * Keyboard optimization
  * Viewport scaling
  * Geolocation forwarding

---

## 🎨 Design Guidelines

* ✅ Dark mode only
* ✅ Rounded UI, gradients, shadows
* ✅ Clean fonts (Apple HIG compliant)
* ✅ Min touch area = 44px
* ✅ Pull-to-refresh with polished transitions

---

## 🧠 AI + Backend Logic

* AI matches users to communities based on quiz data
* Must output **generic community names**

  * Examples: "Weekend Climbers", "Crypto Learners", "Mindful Creatives"
* Matches based on:

  * Interests
  * Values
  * Accurate geolocation

---

## 🛠️ Admin Dashboard (Internal Only)

* Create/manage Partner Events (pinned to Events tab)
* Monitor user activity and reports
* Tools for moderating content and updating descriptions

---

## ✅ Final UX Checklist

| Feature                              | Status |
| ------------------------------------ | ------ |
| Accurate geolocation                 | ✅      |
| Tabs fully functional                | ✅      |
| No join button in joined communities | ✅      |
| Pinned events only from dashboard    | ✅      |
| Real-time member updates             | ✅      |
| Pull to refresh working              | ✅      |
| Navigation/back buttons              | ✅      |
| Modern UI/UX                         | ✅      |
