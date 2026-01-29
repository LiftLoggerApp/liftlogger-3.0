# Development Guide

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ (for local Python API testing, optional)
- Supabase account and project
- Vercel CLI (optional, for full stack dev)

### Setup Steps

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

3. **Set up database**:
   - Go to your Supabase project SQL Editor
   - Copy and paste contents of `supabase/schema.sql`
   - Run the SQL script

## Running Locally

### Full Stack Development (Recommended)

Use Vercel CLI to run both frontend and backend:

```bash
# Install Vercel CLI globally (one-time)
npm install -g vercel

# Run full stack
npx vercel dev
```

This starts:
- Next.js dev server: `http://localhost:3000`
- Python API: Available at `http://localhost:3000/api/*`

### Frontend Only

If you only need to work on UI (API calls will fail):

```bash
npm run dev
```

### Python API Standalone (Optional)

For testing Python API directly:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r api/requirements.txt

# Run with uvicorn
cd api
uvicorn index:app --reload --port 8000
```

Then access API at `http://localhost:8000/api/health`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (frontend only) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx vercel dev` | Run full stack (frontend + Python API) |

## Project Structure

```
liftlogger-3.0/
├── api/                    # Python FastAPI backend
│   ├── index.py           # All API routes
│   └── requirements.txt   # Python dependencies
├── src/
│   ├── app/               # Next.js pages (App Router)
│   │   ├── dashboard/    # Today's workout page
│   │   ├── routines/     # Routine management
│   │   ├── workout/      # Active workout tracker
│   │   └── history/      # Workout history
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities & API client
│   └── middleware.ts      # Auth middleware
├── supabase/
│   └── schema.sql         # Database schema
├── public/                 # Static assets
└── vercel.json            # Vercel config
```

## Development Tips

### Hot Reload

- Frontend: Changes to React components auto-reload
- Backend: With `vercel dev`, Python changes auto-reload

### Debugging

- Frontend: Use browser DevTools and React DevTools
- Backend: Check terminal output for Python errors
- API: Test endpoints at `http://localhost:3000/api/health`

### Common Issues

**API calls failing:**
- Make sure you're using `npx vercel dev` (not just `npm run dev`)
- Check environment variables are set correctly
- Verify Supabase project is active

**Database errors:**
- Ensure schema.sql has been run in Supabase
- Check RLS policies are correct
- Verify user is authenticated

**Build errors:**
- Run `npm run build` to check for TypeScript errors
- Ensure all dependencies are installed

## Testing

Currently no test suite. To add:

```bash
# Frontend tests
npm install -D vitest @testing-library/react

# Backend tests
pip install pytest pytest-asyncio httpx
```

## Environment Variables Reference

| Variable | Required For | Description |
|----------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase anonymous key |
| `SUPABASE_URL` | Backend | Same as above |
| `SUPABASE_SERVICE_KEY` | Backend | Service role key (admin access) |
| `SUPABASE_JWT_SECRET` | Backend | JWT secret for token validation |

Find these in Supabase Dashboard > Settings > API
