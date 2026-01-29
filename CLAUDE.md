# LiftLogger 3.0 - AI Agent Context

## Project Overview

LiftLogger is a PWA workout tracking application with a Next.js 15 frontend and Python FastAPI backend, using Supabase for database and authentication. The app is designed to be deployed on Vercel's free tier.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│  Python FastAPI │────▶│    Supabase     │
│   (Frontend)    │     │   (Serverless)  │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        └────────────────────────────────────────────────┘
                    (Auth - direct client access)
```

### Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Python 3.11, FastAPI, deployed as Vercel Serverless Functions
- **Database**: Supabase PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (JWT-based)
- **State Management**: TanStack Query (React Query)
- **PWA**: @ducanh2912/next-pwa

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages |
| `src/components/` | React components (including shadcn/ui in `ui/`) |
| `src/lib/` | Utilities, API client, Supabase clients |
| `src/hooks/` | Custom React hooks |
| `api/` | Python FastAPI backend (single `index.py` file) |
| `supabase/` | Database schema SQL |

## Code Conventions

### TypeScript/React
- Use `"use client"` directive for client components
- Prefer functional components with hooks
- Use shadcn/ui components from `@/components/ui/`
- API calls go through `src/lib/api.ts` which handles auth headers
- Supabase clients: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server)

### Python Backend
- All routes are in `api/index.py`
- Routes must start with `/api/` (e.g., `@app.get("/api/exercises")`)
- Use Pydantic models for request/response validation
- Auth via `get_current_user` dependency that validates JWT
- Database access via `supabase` Python client

### Styling
- Tailwind CSS v4 with CSS variables for theming
- Dark mode by default (class `dark` on `<html>`)
- Color scheme: neutral grays with red accent (`--primary`)
- Mobile-first responsive design

## Database Schema

### Tables
- `profiles` - User details (auto-created on signup via trigger)
- `exercises` - Master exercise list (pre-seeded)
- `routines` - User's workout templates with schedule day
- `routine_exercises` - Exercises within routines
- `workouts` - Workout sessions with status and timestamps
- `workout_sets` - Individual set logs

### Key Relationships
```
profiles (1) ──── (n) routines ──── (n) routine_exercises ──── (1) exercises
    │
    └──── (n) workouts ──── (n) workout_sets ──── (1) exercises
```

## API Patterns

### Authentication Flow
1. Frontend uses Supabase Auth directly for login/signup
2. Frontend gets JWT from Supabase session
3. API calls include `Authorization: Bearer <token>` header
4. Python backend validates JWT using `SUPABASE_JWT_SECRET`

### API Client Usage
```typescript
// src/lib/api.ts handles auth automatically
import { listRoutines, startWorkout } from "@/lib/api";

// In component
const routines = await listRoutines();
const workout = await startWorkout(routineId);
```

### Adding New Endpoints
1. Add route in `api/index.py`
2. Add corresponding function in `src/lib/api.ts`
3. Update types as needed

## Common Tasks

### Adding a New Page
1. Create directory in `src/app/[route]/`
2. Add `page.tsx` with component
3. Wrap in `<AppShell>` for navigation
4. Add to nav items in `src/components/app-shell.tsx` if needed

### Adding a New UI Component
```bash
npx shadcn@latest add [component-name]
```

### Adding a New API Endpoint
```python
# In api/index.py
@app.post("/api/new-endpoint")
async def new_endpoint(
    data: SomeModel,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Implementation
    return result
```

### Modifying Database Schema
1. Update `supabase/schema.sql`
2. Run new migrations in Supabase SQL Editor
3. Update Python models and API as needed
4. Update TypeScript types in `src/lib/api.ts`

## Environment Variables

### Required for Frontend
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Required for Backend
- `SUPABASE_URL` - Same as above
- `SUPABASE_SERVICE_KEY` - Supabase service role key (for admin access)
- `SUPABASE_JWT_SECRET` - JWT secret for token validation

## Testing Locally

```bash
# Install dependencies
npm install

# Run dev server (frontend only, API requires Vercel CLI)
npm run dev

# For full stack with Python API
npx vercel dev
```

## Deployment

Push to GitHub → Vercel auto-deploys. Ensure all environment variables are set in Vercel project settings.

## Important Notes

1. **Middleware Deprecation**: Next.js 16 deprecates `middleware.ts` in favor of `proxy`. Current implementation still works but may need migration.

2. **PWA in Development**: PWA is disabled in dev mode (`disable: process.env.NODE_ENV === "development"`)

3. **Turbopack**: Project uses Turbopack (Next.js 16 default). The `turbopack: {}` config silences webpack compatibility warnings.

4. **Row Level Security**: All tables have RLS enabled. Users can only access their own data.
