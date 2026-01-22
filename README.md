# Wheelbase Business Portal

Angular 20 web application for motorcycle service providers to manage their business presence on the Wheelbase platform.

**Production URL:** https://business.ridewheelbase.app

## Tech Stack

- **Framework:** Angular 20 (standalone components, signals)
- **Styling:** Tailwind CSS 3.4 + PrimeNG 21
- **Backend:** Supabase (Edge Functions, PostgreSQL)
- **Auth:** Supabase Auth with Google OAuth

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4200)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Project Structure

```
src/app/
├── core/               # Services, auth, models
│   ├── auth/          # AuthService, guards
│   ├── models/        # TypeScript interfaces
│   └── services/      # SupabaseService
├── features/          # Feature modules
│   ├── auth/          # Login, Register, Callback, Claim
│   └── dashboard/     # Business dashboard
└── layout/            # Layout wrappers
    ├── auth-layout/   # Guest routes
    └── main-layout/   # Authenticated routes
```

## Authentication Flow

1. User visits `/login`
2. Signs in with Google OAuth
3. If no business claimed → redirected to `/claim`
4. Enter invite code to claim business
5. Redirected to `/dashboard`

## Environment

Configuration in `src/environments/environment.ts`:
- `supabaseUrl` - Supabase project URL
- `supabaseAnonKey` - Public anon key

## Deployment

Deployed to Vercel via:
```bash
vercel --prod
```

## Related Projects

- [wheelbase-app](../wheelbase-app) - Flutter mobile app
- [wheelbase-admin](../wheelbase-admin) - Admin panel
- [wheelbase-supabase](../wheelbase-supabase) - Backend Edge Functions
