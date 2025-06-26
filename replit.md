# TriPlace - Social Platform

## Overview

TriPlace is a full-stack social platform that connects people through shared experiences, communities, and events. Built with a modern tech stack, it features a React frontend with Express.js backend, utilizing PostgreSQL for data persistence and Firebase for authentication.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript, Vite build tool
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth
- **UI Components**: Radix UI with shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter (lightweight React router)

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Key Components

### Frontend Architecture
- **Component-based**: Modular React components with TypeScript
- **UI System**: Comprehensive design system using Radix UI primitives
- **State Management**: TanStack Query for server state, React Context for app state
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Theme Support**: Built-in light/dark theme switching

### Backend Architecture
- **RESTful API**: Express.js with TypeScript for type safety
- **Database Layer**: Drizzle ORM with PostgreSQL for data persistence
- **Authentication**: Firebase Authentication integration
- **Session Management**: Express sessions with PostgreSQL store
- **File Structure**: Modular route handlers and storage abstraction

### Database Schema
Core entities include:
- **Users**: Firebase UID integration, profiles, interests
- **Communities**: Category-based groupings with membership tracking
- **Events**: Location-aware events with attendance management
- **Messages**: Direct messaging between users
- **Kudos**: Recognition system for user interactions
- **Activity Feed**: Real-time activity tracking

## Data Flow

1. **Authentication Flow**: Firebase handles user authentication, backend creates/retrieves user profiles
2. **API Communication**: Frontend uses TanStack Query for data fetching with automatic caching
3. **Database Operations**: Drizzle ORM handles all database interactions with type safety
4. **Real-time Updates**: Query invalidation ensures fresh data across components

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **Firebase**: Authentication and user management
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling

### Development Tools
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety across the stack
- **ESBuild**: Production bundling for backend
- **Replit Integration**: Development environment optimization

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite provides instant feedback for frontend changes
- **TypeScript Compilation**: Real-time type checking during development

### Production Build
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations handle schema changes
- **Deployment**: Configured for Replit autoscale deployment

### Environment Configuration
- **Database**: PostgreSQL connection via DATABASE_URL
- **Firebase**: Client-side configuration through environment variables
- **Port Configuration**: Express server on port 5000, proxied through Vite in development

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Implemented comprehensive 15-question onboarding quiz
  - Quiz captures past experiences, present interests, future goals, and personality preferences
  - New users automatically redirected to quiz after authentication
  - Returning users skip quiz and go directly to dashboard
  - Quiz data stored in user profile for intelligent community matching
  - Authentication switched from redirect to popup for better reliability
  - Removed romantic/dating references to focus on platonic community building
  - Final quiz section properly navigates to dashboard upon completion

- June 26, 2025. Built smart community card system with real-time filtering
  - Dynamic communities created from quiz data + geolocation + interest matching
  - 70% interest match requirement with 50-mile geo-filtering
  - Enhanced community cards with emoji icons, member counts, and activity indicators
  - Real-time updates when location changes, quiz completes, or new activity occurs
  - Mobile-first design with swipe gestures (swipe left to favorite, right to pin)
  - Live status indicators for posts, events, and member activity
  - Prioritizes communities with high engagement and recent events

- June 26, 2025. Implemented AI-powered community matching system
  - OpenAI GPT-4o integration for intelligent community recommendations
  - Analyzes complete quiz responses for nuanced personality and interest matching
  - AI generates personalized community descriptions and suggested roles
  - Dynamic algorithm that learns and adapts rather than fixed keyword matching
  - Fallback to basic algorithm if AI fails to ensure reliability
  - AI can also generate missing communities that should exist for unique user profiles
  - Real-time integration with location data and user preferences

- June 26, 2025. Enhanced mobile geolocation with hybrid GPS + IP fallback
  - Mobile-optimized GPS settings with higher timeout and caching
  - Automatic IP-based location fallback when GPS unavailable or denied
  - Location source indicators (precise GPS vs approximate IP)
  - Enhanced user experience with location permission prompts
  - Real-time location integration with community recommendations
  - Following industry standards for mobile app geolocation implementation
  - Reverse geocoding displays actual city, state, zip code in sidebar
  - Communities filtered by location while hiding location details from interface

- June 26, 2025. Implemented dynamic community membership system
  - Static community titles with dynamic membership based on location + quiz compatibility
  - 50-mile radius filtering with 70% interest overlap requirement
  - Real-time member counts update based on user location and interests
  - Backend automatically tracks user coordinates for community matching
  - Communities show actual nearby users who match interests, not fixed member counts
  - Location-aware API endpoints for dynamic member discovery

- June 26, 2025. Enhanced AI-driven community matching as primary system
  - AI curates highly selective communities with 70%+ compatibility scores
  - Dynamic matching philosophy focuses on quality over quantity connections
  - Personalized community descriptions and suggested roles generated by AI
  - Geographic proximity weighting within 50-mile radius for local relevance
  - AI analyzes deep personality patterns from quiz responses for meaningful matches
  - Fallback algorithm ensures reliable service when AI quota exceeded
  - Each user receives unique, selective community portfolio tailored to their growth trajectory

- June 26, 2025. Implemented dynamic radius expansion logic for member matching
  - Primary matching within 50-mile radius with 70% interest overlap requirement
  - Automatic expansion to 100-mile radius when no qualifying members found within 50 miles
  - Real-time evaluation and re-matching against same 70% compatibility criteria
  - Background processing ensures seamless user experience during radius expansion
  - System logs provide transparency about which radius was used for each community
  - Enhanced member discovery for users in less populated areas while maintaining quality standards

- June 26, 2025. Redesigned dashboard with focused user experience
  - User banner with welcome message, profile picture, location, and theme toggle
  - Event calendar widget with color-coded community events and kudos system
  - "Create Event" functionality for community-coordinated revenue sharing (5-10% cut)
  - Today's discoveries panel with AI-driven recommendations and high-match members
  - Weekly challenges system with progress tracking (attend events, post, meet challenges)
  - Integrated kudos system with monthly counts, leaderboards, and peer appreciation
  - Clean layout optimized for meaningful community interactions and engagement

- June 26, 2025. Implemented comprehensive community tabs system
  - Live messaging feed with real-time group chat and resonate (like) functionality
  - Community event panels showing local events filtered by category and location
  - Member highlights displaying nearby users with match percentages and kudos buttons
  - Dynamic membership system with location-aware member discovery (50-100 mile radius)
  - Post creation interface with emoji support and instant message delivery
  - Pinned announcements system for community leaders to share important updates
  - Four-tab interface: Live Feed, Events, Members, and Highlights for complete community interaction

- June 26, 2025. Created enterprise-grade settings system matching high-end social apps
  - Comprehensive settings dropdown menu with organized categories like Instagram/Facebook
  - Dedicated settings pages: Profile, Account, Notifications, Community Preferences, Security, Support
  - Profile settings with photo management, bio editing, interests, and privacy controls
  - Account management with connected services, email settings, and account deletion
  - Granular notification controls for push, email, in-app, and quiet hours settings
  - Community preferences with matching algorithm controls, discovery settings, and quiz retaking
  - Advanced security features including 2FA setup, session management, and device monitoring
  - Professional support system with FAQ, contact forms, help resources, and safety reporting
  - All settings pages feature modern responsive design with proper navigation and form handling

- June 26, 2025. Completed comprehensive deployment readiness preparation
  - Implemented error boundaries throughout application with graceful fallbacks
  - Enhanced loading states with consistent spinner components across all pages
  - Added production-quality error handling for Firebase auth and API requests
  - Created comprehensive environment variable validation with fallback configurations
  - Implemented production configuration constants for performance and UI settings
  - Enhanced Firebase configuration with proper error handling and validation
  - Added deployment readiness checks for monitoring production health
  - Fixed DOM nesting errors and JSX syntax issues for clean production builds
  - All core features tested and working: authentication, communities, settings, onboarding
  - Application ready for Replit deployment with all discussed features integrated

- June 26, 2025. Implemented 5-community maximum limit with activity-based rotation system
  - Enhanced database schema with activity tracking fields for community members
  - Built intelligent rotation logic that drops least active community when joining new ones
  - Dashboard displays "User's Name's Communities" with activity scores and last activity dates
  - Join Community button in Today's Discoveries triggers rotation with user feedback toasts
  - Four-tab community interface: Live Feed, Events, Members, and Highlights
  - Real-time messaging with resonate functionality and typing indicators
  - Dynamic member discovery with match percentages and geographic proximity
  - Community activity automatically updates when users interact (messages, events, kudos)
  - Smart fallback system ensures users always have meaningful community recommendations
  - Complete implementation of all attached requirements for community tabs and rotation

- June 26, 2025. Redesigned community messaging with Instagram Direct Message experience
  - Instagram-style chat header with live status indicators and online member counts
  - Message bubbles with rounded corners, shadows, and hover interactions
  - Gradient avatar fallbacks and reaction previews on message bubbles
  - Enhanced message input with emoji picker, character counter, and send button
  - Smooth scrolling message feed with proper loading states and empty state design
  - Interactive message actions: Resonate, Reply, Share with hover animations
  - Real-time typing indicators and message delivery status
  - Professional visual hierarchy matching high-end social messaging apps
  - Enter to send, Shift+Enter for new line keyboard shortcuts
  - Community-focused messaging that encourages meaningful connections and engagement

- June 26, 2025. Enhanced user interface and community engagement features
  - Implemented dynamic online member counts based on actual location and interest compatibility
  - Made pinned announcements compact and collapsible to reduce interface clutter
  - Repositioned "Local Kudos Leaders" above "Weekly Challenges" as collapsible dropdown
  - Removed duplicate kudos leaderboard sections for cleaner dashboard organization
  - Enhanced "Join Community Chat" button with prominent green design and clear call-to-action
  - Added descriptive subtitle "Start connecting with members" for better user understanding
  - Improved button visibility with larger size, hover animations, and enhanced visual hierarchy
  - Implemented real-time messaging with optimistic UI updates for instant message visibility
  - Enhanced community entry buttons with gradient design, animated arrows, and clear "Enter" text
  - Reduced message polling to 500ms for near real-time chat experience matching modern messaging apps

- June 26, 2025. Fixed community messaging and dashboard recommendations
  - Added missing GET /api/communities/:id/messages route for proper message retrieval
  - Fixed database query to correctly map user data (names, avatars) to community messages
  - Implemented "First Name + Last Initial" formatting for user display names
  - Made profile pictures clickable with hover animations for profile navigation
  - Fixed dashboard recommendations to exclude already-joined communities from "Today's Discoveries"
  - Enhanced recommendation filtering for both AI-powered and fallback algorithms
  - Community chat now displays actual user information instead of "Anonymous"

- June 26, 2025. Implemented comprehensive web scraping system for community events
  - Built EventScraper class with Eventbrite and Meetup API integration for real event data
  - Created intelligent filtering system that matches scraped events to community topics and categories
  - Added deduplication logic to prevent duplicate events and relevance scoring algorithms
  - Implemented API routes for event scraping with location-based filtering (25-mile radius)
  - Enhanced Events tab with "Find Events" button to trigger real-time event discovery
  - Separated scraped external events from community-created events with distinct visual styling
  - Events are filtered and matched exactly to community interests with 70% relevance threshold
  - Real-time integration with user location data for hyper-local event recommendations
  - Events automatically populate based on community category with fallback error handling

- June 26, 2025. Extended event sources and added community event creation functionality
  - Expanded EventScraper to support multiple major platforms: Ticketmaster, Facebook, StubHub, Eventful, Universe, and SeatGeek
  - Implemented parallel API calls with Promise.allSettled for robust multi-source event discovery
  - Added comprehensive event creation system allowing community members to create their own events
  - Built intuitive event creation dialog with title, description, date/time, location, and pricing fields
  - Created POST /api/communities/:id/events backend endpoint for event creation with validation
  - Events tab now displays both external scraped events and community-created events in separate sections
  - Event creation includes automatic activity feed updates and proper error handling
  - Enhanced user engagement by allowing communities to organize their own meetups and activities
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```