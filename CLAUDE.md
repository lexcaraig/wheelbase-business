# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wheelbase Business Portal - Angular 20 web application for motorcycle service providers to manage their business presence on the Wheelbase platform. Part of the larger Wheelbase ecosystem (see parent CLAUDE.md at `/Users/lexcaraig/development/Wheelbase/CLAUDE.md`).

**Tech Stack:** Angular 20, TypeScript 5.8, Tailwind CSS 3.4, PrimeNG 21, Supabase (auth & Edge Functions)

## Commands

```bash
# Development
npm start                    # Start dev server at http://localhost:4200
npm run build               # Production build to dist/

# Testing
npm test                    # Run Karma unit tests

# Code Generation
ng generate component <name>  # New component (SCSS, no test file per angular.json)
ng generate service <name>    # New service
```

## Architecture

```
src/app/
├── core/                   # Singleton services and models
│   ├── auth/              # AuthService (signals-based), AuthGuard, GuestGuard
│   ├── models/            # TypeScript interfaces (Business, API responses)
│   └── services/          # SupabaseService (client wrapper)
├── features/              # Feature modules (lazy-loaded)
│   ├── auth/             # Login, Register components
│   └── dashboard/        # Business dashboard
└── layout/               # Layout wrappers
    ├── auth-layout/      # For guest routes (login/register)
    └── main-layout/      # For authenticated routes (sidebar nav)
```

## Key Patterns

**State Management:** Angular Signals (not RxJS Observables for component state)
- `AuthService` uses `signal()` and `computed()` for reactive state
- Access via `authService.business()`, `authService.isAuthenticated()`, etc.

**Components:** Standalone components with inline templates (no separate .html files)
- All components use `standalone: true`
- Templates use `@switch`, `@if`, `@for` control flow (Angular 17+ syntax)

**Routing:** Two layout branches protected by guards
- `AuthGuard` → requires authentication → `MainLayoutComponent`
- `GuestGuard` → only unauthenticated → `AuthLayoutComponent`

**Backend Communication:** Supabase Edge Functions via `SupabaseService`
```typescript
// Public endpoint
await supabase.callFunction<T>('function-name', body);

// Authenticated endpoint
await supabase.callFunctionWithAuth<T>('function-name', body);
```

**Edge Function Response Format:**
```typescript
{ success: boolean, data?: T, error?: { message: string, code: number } }
```

## Styling

- Tailwind CSS with custom theme in `tailwind.config.js`
- CSS variables defined in `src/styles.scss` (dark theme)
- Primary color: `#FFD535` (Wheelbase yellow)
- Background: `#0D1117` (dark), `#161B22` (secondary), `#1E2329` (tertiary)
- Utility classes: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`, `.badge-*`

## Environment

Configuration in `src/environments/environment.ts`:
- `supabaseUrl`: Supabase project URL
- `supabaseAnonKey`: Public anon key
- `redirectUrl`: OAuth callback URL

## Business Model Types

```typescript
type BusinessType = 'shop' | 'service_provider' | 'retailer' | 'dealership';
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type SubscriptionTier = 'free' | 'pro' | 'enterprise';
```

## Notes

- Tests are disabled by default in `angular.json` schematics (`skipTests: true`)
- Development port is 4200 (differs from admin portal which uses 4300)
- Phase 2 routes (products, services, appointments, analytics, settings) exist but redirect to dashboard placeholder
