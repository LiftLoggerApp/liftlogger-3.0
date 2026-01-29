# Required Secrets for Deployment

This document lists all environment variables/secrets needed to deploy LiftLogger 3.0.

## Required Secrets (4 total)

> **Note**: Supabase has moved to asymmetric ES256 JWT signing. The backend now verifies tokens using the public key from Supabase's JWKS endpoint, so `SUPABASE_JWT_SECRET` is no longer required.

### Frontend Secrets (Public - Safe to expose in client code)

These are prefixed with `NEXT_PUBLIC_` and will be bundled into the client-side JavaScript. They are safe to expose because they're meant to be public.

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | Supabase Dashboard > Settings > API Keys > Publishable key |

**New key format (recommended):**
```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

**Legacy JWT format (still works):**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend Secrets (Private - Server-side only)

These are **NOT** prefixed with `NEXT_PUBLIC_` and should **NEVER** be exposed to the client. They run only on the server/Vercel functions.

| Variable | Description | Where to Find | Security Level |
|----------|-------------|---------------|----------------|
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` | Same as above | ⚠️ Private |
| `SUPABASE_SERVICE_KEY` | Supabase secret key (admin access) | Supabase Dashboard > Settings > API Keys > Secret key | 🔴 **CRITICAL** - Full database access |

**New key format (recommended):**
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxx
```

**Legacy JWT format (still works):**
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### No longer required

| Variable | Status | Reason |
|----------|--------|--------|
| `SUPABASE_JWT_SECRET` | ❌ Removed | Supabase now uses ES256 asymmetric keys. JWTs are verified using the public key from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |

## Optional Secrets

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_SITE_URL` | Your deployed site URL (for redirects) | `http://localhost:3000` | No (only for production redirects) |

## Vercel-Specific Notes

### ✅ No Vercel Secrets Required!

**Important**: Vercel does **NOT** require any API keys or authentication tokens in your codebase or environment variables.

- **GitHub Integration**: Connect your GitHub repo to Vercel → automatic deployments. No secrets needed.
- **Vercel CLI**: For local dev (`vercel dev`), run `vercel login` once. Tokens are stored locally in `~/.vercel` (not in your project).
- **`.vercel` folder**: Contains project config (gitignored). Safe to commit if needed, but usually not necessary.

### What Vercel Needs:
1. ✅ Your code (pushed to GitHub)
2. ✅ Environment variables (the 4 Supabase secrets listed above)
3. ✅ `vercel.json` config file (already in repo)

### What Vercel Does NOT Need:
- ❌ Vercel API tokens in your code
- ❌ Vercel authentication secrets
- ❌ Any Vercel-specific environment variables

## Where to Set These

### ⚠️ Important: Separate Databases for Dev and Prod

**Best Practice**: Use **separate Supabase projects** for local development and production.

- **Local Dev**: Use a separate Supabase project (or your personal dev project)
- **Production**: Use a different Supabase project for your live app

This prevents:
- ❌ Accidentally deleting production data during development
- ❌ Polluting production database with test data
- ❌ Breaking production while testing

### Local Development

Create `.env.local` in the project root (this file is gitignored):
```env
# Use your DEV Supabase project credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxx
```

**Setup Steps:**
1. Create a new Supabase project for development (or use an existing dev project)
2. Run `supabase/schema.sql` in your **dev** project's SQL Editor
3. Copy dev project credentials to `.env.local`

### Vercel Deployment

**No Vercel API keys needed!** Vercel deployment uses GitHub integration (no secrets required).

#### Setting Environment Variables in Vercel:
1. Go to your Vercel project dashboard
2. Settings > Environment Variables
3. Add each variable for:
   - **Production** environment → Use your **PRODUCTION** Supabase project credentials
   - **Preview** environment (optional) → Can use dev or staging Supabase project
   - **Development** environment (optional, for `vercel dev`) → Use dev Supabase project

**Important**: Make sure Production environment uses a **different Supabase project** than your local `.env.local`!

#### Vercel CLI Authentication (for local dev only):
If you want to use `npx vercel dev` locally:
```bash
npx vercel login
```
This stores authentication tokens locally in `~/.vercel` (not in your project). No secrets needed in your repo.

#### Deployment Methods:
- **GitHub Integration** (Recommended): Push to GitHub → Vercel auto-deploys. No Vercel secrets needed.
- **Vercel CLI**: Run `vercel` or `vercel --prod` (requires `vercel login` first, but tokens stay local)

## Security Notes

### 🔴 Critical Secrets
- **`SUPABASE_SERVICE_KEY`**: Has full database admin access. If leaked, attacker can read/write all data.
- **`SUPABASE_JWT_SECRET`**: Can validate any JWT token. If leaked, attacker can forge authentication tokens.

### ✅ Safe to Expose
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Designed to be public. Protected by Row Level Security (RLS) policies in Supabase.

### Best Practices
1. ✅ Never commit `.env.local` or any `.env*` files
2. ✅ Use different Supabase projects for dev/staging/production
3. ✅ Rotate secrets if accidentally exposed
4. ✅ Use Vercel's environment variable UI (don't hardcode)
5. ✅ Enable RLS policies in Supabase (already configured in `supabase/schema.sql`)

## Quick Setup Checklist

### Local Development Setup
- [ ] Create **DEV** Supabase project (separate from production!)
- [ ] Run `supabase/schema.sql` in **DEV** project's SQL Editor
- [ ] Create `.env.local` with **DEV** project credentials:
  - Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
  - Copy Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Copy Secret key (`sb_secret_...`) → `SUPABASE_SERVICE_KEY`
- [ ] Test locally: `npx vercel dev`

### Production Deployment Setup
- [ ] Create **PRODUCTION** Supabase project (different from dev!)
- [ ] Run `supabase/schema.sql` in **PRODUCTION** project's SQL Editor
- [ ] Push code to GitHub
- [ ] Import project to Vercel (connect GitHub repo)
- [ ] Add all 4 environment variables in Vercel Settings → **Production** environment
- [ ] Use **PRODUCTION** Supabase credentials (NOT dev credentials!)
- [ ] Deploy! (automatic on push to main branch)

**Note**: No Vercel API keys or tokens needed - GitHub integration handles authentication.

### Environment Separation Summary

| Environment | Supabase Project | Where Configured |
|-------------|------------------|------------------|
| **Local Dev** | DEV project | `.env.local` (gitignored) |
| **Vercel Preview** | DEV or STAGING | Vercel Dashboard → Preview env |
| **Vercel Production** | PRODUCTION | Vercel Dashboard → Production env |

## Finding Your Secrets

### Supabase Dashboard (New Key Format)
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project
3. Go to **Settings** → **API**
4. Under **Project URL**:
   - Copy the URL → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
5. Under **API Keys** tab:
   - **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ Safe to expose
   - **Secret key** (`sb_secret_...`) → `SUPABASE_SERVICE_KEY` 🔴 Keep secret!

### Legacy Keys (still work)
If you see JWT-format keys (starting with `eyJ...`), those still work:
- `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` → `SUPABASE_SERVICE_KEY`

### JWT Verification (Automatic)
The backend automatically verifies user JWTs using Supabase's public JWKS endpoint:
```
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```
No manual JWT secret configuration is needed.
