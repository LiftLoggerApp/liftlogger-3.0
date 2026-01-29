-- LiftLogger Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ PROFILES ============
-- Linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ EXERCISES ============
-- Master list of exercises (pre-populated)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'strength',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ROUTINES ============
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_day_index INTEGER NOT NULL CHECK (schedule_day_index >= 0 AND schedule_day_index <= 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_schedule_day ON routines(user_id, schedule_day_index);

-- ============ ROUTINE EXERCISES ============
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps_min INTEGER NOT NULL DEFAULT 8,
  target_reps_max INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);

-- ============ WORKOUTS ============
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  routine_name TEXT, -- Snapshot of routine name at time of workout
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_status ON workouts(user_id, status);
CREATE INDEX idx_workouts_start_time ON workouts(user_id, start_time DESC);

-- ============ WORKOUT SETS ============
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe DECIMAL(3, 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sets_workout ON workout_sets(workout_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises: Anyone can read (public list)
CREATE POLICY "Exercises are viewable by everyone" ON exercises FOR SELECT TO authenticated USING (true);

-- Routines: Users can only access their own
CREATE POLICY "Users can view own routines" ON routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own routines" ON routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines" ON routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines" ON routines FOR DELETE USING (auth.uid() = user_id);

-- Routine Exercises: Access through routine ownership
CREATE POLICY "Users can view own routine exercises" ON routine_exercises FOR SELECT 
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "Users can create own routine exercises" ON routine_exercises FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "Users can update own routine exercises" ON routine_exercises FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "Users can delete own routine exercises" ON routine_exercises FOR DELETE 
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()));

-- Workouts: Users can only access their own
CREATE POLICY "Users can view own workouts" ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workouts" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout Sets: Access through workout ownership
CREATE POLICY "Users can view own workout sets" ON workout_sets FOR SELECT 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can create own workout sets" ON workout_sets FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can update own workout sets" ON workout_sets FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can delete own workout sets" ON workout_sets FOR DELETE 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));

-- ============ SEED DATA: EXERCISES ============
INSERT INTO exercises (name, muscle_group, category) VALUES
-- Chest
('Bench Press', 'Chest', 'strength'),
('Incline Bench Press', 'Chest', 'strength'),
('Decline Bench Press', 'Chest', 'strength'),
('Dumbbell Bench Press', 'Chest', 'strength'),
('Incline Dumbbell Press', 'Chest', 'strength'),
('Dumbbell Flyes', 'Chest', 'strength'),
('Cable Crossover', 'Chest', 'strength'),
('Push-ups', 'Chest', 'bodyweight'),
('Chest Dips', 'Chest', 'bodyweight'),

-- Back
('Deadlift', 'Back', 'strength'),
('Barbell Row', 'Back', 'strength'),
('Dumbbell Row', 'Back', 'strength'),
('Pull-ups', 'Back', 'bodyweight'),
('Chin-ups', 'Back', 'bodyweight'),
('Lat Pulldown', 'Back', 'strength'),
('Seated Cable Row', 'Back', 'strength'),
('T-Bar Row', 'Back', 'strength'),
('Face Pulls', 'Back', 'strength'),

-- Shoulders
('Overhead Press', 'Shoulders', 'strength'),
('Dumbbell Shoulder Press', 'Shoulders', 'strength'),
('Arnold Press', 'Shoulders', 'strength'),
('Lateral Raises', 'Shoulders', 'strength'),
('Front Raises', 'Shoulders', 'strength'),
('Rear Delt Flyes', 'Shoulders', 'strength'),
('Upright Rows', 'Shoulders', 'strength'),
('Shrugs', 'Shoulders', 'strength'),

-- Arms
('Barbell Curl', 'Arms', 'strength'),
('Dumbbell Curl', 'Arms', 'strength'),
('Hammer Curl', 'Arms', 'strength'),
('Preacher Curl', 'Arms', 'strength'),
('Concentration Curl', 'Arms', 'strength'),
('Tricep Pushdown', 'Arms', 'strength'),
('Skull Crushers', 'Arms', 'strength'),
('Overhead Tricep Extension', 'Arms', 'strength'),
('Close Grip Bench Press', 'Arms', 'strength'),
('Dips', 'Arms', 'bodyweight'),

-- Legs
('Squat', 'Legs', 'strength'),
('Front Squat', 'Legs', 'strength'),
('Leg Press', 'Legs', 'strength'),
('Lunges', 'Legs', 'strength'),
('Bulgarian Split Squat', 'Legs', 'strength'),
('Romanian Deadlift', 'Legs', 'strength'),
('Leg Curl', 'Legs', 'strength'),
('Leg Extension', 'Legs', 'strength'),
('Calf Raises', 'Legs', 'strength'),
('Hip Thrust', 'Legs', 'strength'),
('Goblet Squat', 'Legs', 'strength'),

-- Core
('Plank', 'Core', 'bodyweight'),
('Crunches', 'Core', 'bodyweight'),
('Russian Twists', 'Core', 'strength'),
('Leg Raises', 'Core', 'bodyweight'),
('Ab Wheel Rollout', 'Core', 'strength'),
('Cable Woodchops', 'Core', 'strength'),
('Dead Bug', 'Core', 'bodyweight'),
('Mountain Climbers', 'Core', 'cardio'),

-- Cardio
('Running', 'Cardio', 'cardio'),
('Cycling', 'Cardio', 'cardio'),
('Rowing', 'Cardio', 'cardio'),
('Jump Rope', 'Cardio', 'cardio'),
('Stair Climber', 'Cardio', 'cardio'),
('Elliptical', 'Cardio', 'cardio')
ON CONFLICT DO NOTHING;
