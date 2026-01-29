import { createClient } from "@/lib/supabase/client";

const API_BASE = "/api";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ EXERCISES ============
export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  category: string;
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  return apiRequest<Exercise[]>(`/exercises/search?q=${encodeURIComponent(query)}`);
}

export async function listExercises(): Promise<Exercise[]> {
  return apiRequest<Exercise[]>("/exercises");
}

// ============ ROUTINES ============
export interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

export interface Routine {
  id: string;
  name: string;
  schedule_day_index: number;
  exercises: RoutineExercise[];
}

export interface RoutineInput {
  name: string;
  schedule_day_index: number;
  exercises: {
    exercise_id: string;
    order: number;
    target_sets: number;
    target_reps_min: number;
    target_reps_max: number;
  }[];
}

export async function listRoutines(): Promise<Routine[]> {
  return apiRequest<Routine[]>("/routines");
}

export async function createRoutine(data: RoutineInput): Promise<Routine> {
  return apiRequest<Routine>("/routines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRoutine(id: string, data: RoutineInput): Promise<Routine> {
  return apiRequest<Routine>(`/routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiRequest(`/routines/${id}`, { method: "DELETE" });
}

// ============ WORKOUTS ============
export interface Workout {
  id: string;
  start_time: string;
  end_time: string | null;
  status: "in_progress" | "completed" | "cancelled";
  routine_name: string | null;
}

export interface SetLog {
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
}

export async function getActiveWorkout(): Promise<Workout | null> {
  return apiRequest<Workout | null>("/workouts/active");
}

export async function startWorkout(routineId?: string): Promise<Workout> {
  const params = routineId ? `?routine_id=${routineId}` : "";
  return apiRequest<Workout>(`/workouts/start${params}`, { method: "POST" });
}

export async function getWorkout(id: string): Promise<{
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  routine_name: string | null;
  workout_sets: {
    id: string;
    exercise_id: string;
    set_number: number;
    weight: number;
    reps: number;
    rpe: number | null;
    exercises: Exercise;
  }[];
}> {
  return apiRequest(`/workouts/${id}`);
}

export async function logSet(workoutId: string, data: SetLog): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/sets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function finishWorkout(id: string): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/${id}/finish`, { method: "POST" });
}

// ============ HISTORY ============
export interface WorkoutSummary {
  id: string;
  start_time: string;
  end_time: string | null;
  routine_name: string | null;
  total_volume: number;
  total_sets: number;
}

export async function getHistory(limit = 20, offset = 0): Promise<WorkoutSummary[]> {
  return apiRequest<WorkoutSummary[]>(`/history?limit=${limit}&offset=${offset}`);
}

export async function getExerciseHistory(exerciseId: string): Promise<{
  weight: number;
  reps: number;
  set_number: number;
  workouts: { start_time: string };
}[]> {
  return apiRequest(`/exercises/${exerciseId}/history`);
}

// ============ HELPERS ============
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getDayName(index: number): string {
  return DAY_NAMES[index] || "Unknown";
}

export function formatDuration(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
  
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
