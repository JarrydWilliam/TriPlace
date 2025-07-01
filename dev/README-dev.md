# Development Folder Structure

This folder contains all development-only code, configurations, and utilities that are excluded from production builds.

## Structure

```
dev/
├── README-dev.md           # This file - development workflow documentation
├── configs/                # Development-only configurations
│   ├── vite.dev.config.ts # Development-specific Vite plugins and settings
│   └── debug.config.ts    # Debug configuration settings
├── scripts/               # Development and testing scripts
│   ├── db-seed.ts        # Database seeding with test data
│   ├── clear-db.ts       # Database cleanup script
│   └── generate-mock.ts  # Mock data generation utilities
├── utils/                 # Development utilities
│   ├── debug.ts          # Debug helpers and logging utilities
│   ├── test-helpers.ts   # Testing utility functions
│   └── mock-api.ts       # Mock API endpoints for development
├── components/            # Development-only components
│   ├── dev-panel.tsx     # Development control panel
│   └── debug-info.tsx    # Debug information display
├── data/                  # Mock and test data
│   ├── mock-users.json   # Sample user data
│   ├── mock-communities.json # Sample community data
│   └── mock-events.json  # Sample event data
└── tests/                 # Test files and configurations
    ├── setup.ts          # Test environment setup
    └── __mocks__/        # Mock implementations
```

## Usage

### Running Development Scripts
```bash
# Seed database with test data
npm run dev:seed

# Clear database
npm run dev:clear

# Generate mock data
npm run dev:mock
```

### Development Configuration
- Development-specific Vite plugins are in `dev/configs/vite.dev.config.ts`
- Debug settings are configured in `dev/configs/debug.config.ts`
- All development utilities are available in `dev/utils/`

### Production Exclusion
- The entire `dev/` folder is excluded from production builds
- Production scripts ignore all dev/ content
- Only authenticated, real data sources are used in production

## Guidelines

1. **Never import dev/ content in production code**
2. **All mock data and test utilities go in dev/**
3. **Debug helpers are available in dev/utils/debug.ts**
4. **Development-only components go in dev/components/**
5. **All test files and configurations go in dev/tests/**

## Development Workflow

1. Use `dev/utils/debug.ts` for logging and debug helpers
2. Mock data is available in `dev/data/` for testing
3. Development components in `dev/components/` for debugging UI
4. Run development scripts from `dev/scripts/` as needed
5. All development configurations are isolated in `dev/configs/`