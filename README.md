# TriPlace Mobile App

TriPlace is a React Native mobile application built with Expo, designed to connect people through location-aware communities and authentic social interactions.

## Features

- **Authentication**: Firebase email/password authentication
- **Location Services**: GPS-based community discovery and event recommendations
- **Communities**: Join interest-based communities with real-time messaging
- **Events**: Discover and create local events with attendance tracking
- **Messaging**: Direct messaging between community members
- **Theme Support**: Light/dark mode with system preference detection

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: TanStack Query (React Query)
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Location**: Expo Location
- **UI Components**: React Native Paper + Custom Components
- **Icons**: React Native Vector Icons (Material Icons)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Expo CLI globally:
```bash
npm install -g @expo/cli
```

3. Configure Firebase:
   - Add `google-services.json` (Android) to project root
   - Add `GoogleService-Info.plist` (iOS) to project root

## Development

Start the development server:
```bash
npm start
```

Run on specific platforms:
```bash
npm run android
npm run ios
```

## Project Structure

```
src/
├── contexts/          # React contexts (Auth, Theme, Location)
├── screens/           # App screens
├── components/        # Reusable UI components
├── services/          # API and external service integrations
└── types/             # TypeScript type definitions
```

## Key Features Implemented

### Authentication Flow
- Email/password registration and login
- Firebase authentication integration
- Automatic user profile creation

### Onboarding
- Interest selection from predefined categories
- Location permission and GPS setup
- Progressive onboarding with step indicators

### Communities
- Location-aware community discovery
- Real-time messaging with Firebase
- Member management and online status
- Category-based filtering and search

### Events
- Event creation with date/time/location
- Virtual event support with meeting links
- Attendance tracking and registration
- Revenue sharing for paid events (7% platform fee)

### Profile Management
- Profile editing with photo upload
- Interest management
- Theme switching (light/dark/system)
- Settings and preferences

## Firebase Configuration

The app requires Firebase project setup with:
- Authentication (Email/Password provider enabled)
- Firestore Database
- Storage (for profile pictures)

## Deployment

Build for production:
```bash
eas build --platform all
```

Submit to app stores:
```bash
eas submit --platform all
```

## Environment Variables

Create a `.env` file with:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Test on both iOS and Android platforms
4. Update documentation for new features