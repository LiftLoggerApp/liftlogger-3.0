# LiftLogger 3.0

A PWA workout tracking app built with Next.js 15, Python (FastAPI), and Supabase.

## Features

- **Scheduled Routines**: Create weekly workout routines for each day
- **Live Workout Tracking**: Active timer, set logging, and exercise management
- **Workout History**: View completed workouts with volume and duration stats
- **PWA Support**: Install on mobile or desktop for native-like experience

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python (FastAPI) on Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **State**: TanStack Query

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Get your project URL and keys from Settings > API

### 2. Environment Variables

Create a `.env.local` file:

```env
# Frontend (public)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend (server-side)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

Find the JWT secret in Supabase > Settings > API > JWT Settings.

### 3. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 4. Run Development Server

**Option A: Full Stack (Recommended)**

Run both frontend and Python API using Vercel CLI:

```bash
npx vercel dev
```

This will:
- Start Next.js dev server on `http://localhost:3000`
- Run Python FastAPI backend as serverless functions
- Handle API routing automatically

**Option B: Frontend Only**

If you only want to work on the frontend (API calls will fail):

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Note**: For full functionality, you need Option A since the Python API handles all backend logic.

## Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

Vercel automatically detects the Python backend in `/api` and deploys it as serverless functions.

## Project Structure

```
├── api/                    # Python FastAPI backend
│   ├── index.py           # Main API routes
│   └── requirements.txt   # Python dependencies
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities and API client
├── supabase/
│   └── schema.sql         # Database schema
└── vercel.json            # Vercel configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/exercises` | List all exercises |
| GET | `/api/exercises/search?q=` | Search exercises |
| GET | `/api/routines` | Get user's routines |
| POST | `/api/routines` | Create routine |
| PUT | `/api/routines/:id` | Update routine |
| DELETE | `/api/routines/:id` | Delete routine |
| GET | `/api/workouts/active` | Get active workout |
| POST | `/api/workouts/start` | Start new workout |
| GET | `/api/workouts/:id` | Get workout details |
| POST | `/api/workouts/:id/sets` | Log a set |
| POST | `/api/workouts/:id/finish` | Complete workout |
| GET | `/api/history` | Get workout history |
