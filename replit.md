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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```