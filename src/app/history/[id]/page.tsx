"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, Dumbbell, Calendar } from "lucide-react";
import { getWorkout, formatDuration } from "@/lib/api";

interface WorkoutSet {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  exercises: {
    id: string;
    name: string;
    muscle_group: string;
  };
}

interface WorkoutDetail {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  routine_name: string | null;
  workout_sets: WorkoutSet[];
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: workoutId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getWorkout(workoutId);
        setWorkout(data as WorkoutDetail);
      } catch (error) {
        console.error("Failed to load workout:", error);
        router.push("/history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workoutId, router]);

  if (loading || !workout) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      </AppShell>
    );
  }

  // Group sets by exercise
  const exerciseSets = workout.workout_sets.reduce((groups, set) => {
    const exerciseId = set.exercise_id;
    if (!groups[exerciseId]) {
      groups[exerciseId] = {
        exercise: set.exercises,
        sets: [],
      };
    }
    groups[exerciseId].sets.push(set);
    return groups;
  }, {} as Record<string, { exercise: { id: string; name: string; muscle_group: string }; sets: WorkoutSet[] }>);

  // Sort sets within each exercise
  Object.values(exerciseSets).forEach((group) => {
    group.sets.sort((a, b) => a.set_number - b.set_number);
  });

  const totalVolume = workout.workout_sets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-20">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/history")}
          className="text-neutral-400 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {workout.routine_name || "Quick Workout"}
          </h1>
          <div className="flex items-center gap-2 text-neutral-400 mt-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(workout.start_time)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardContent className="py-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-neutral-500 mb-2" />
              <p className="text-lg font-bold">
                {formatDuration(workout.start_time, workout.end_time)}
              </p>
              <p className="text-xs text-neutral-500">Duration</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardContent className="py-4 text-center">
              <Dumbbell className="w-5 h-5 mx-auto text-neutral-500 mb-2" />
              <p className="text-lg font-bold">{workout.workout_sets.length}</p>
              <p className="text-xs text-neutral-500">Sets</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardContent className="py-4 text-center">
              <div className="w-5 h-5 mx-auto text-neutral-500 mb-2 flex items-center justify-center text-sm font-bold">
                Σ
              </div>
              <p className="text-lg font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Volume (lbs)</p>
            </CardContent>
          </Card>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Exercises</h2>
          {Object.values(exerciseSets).map(({ exercise, sets }) => (
            <Card key={exercise.id} className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{exercise.name}</CardTitle>
                <p className="text-sm text-neutral-500">{exercise.muscle_group}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-xs text-neutral-500 font-medium pb-2">
                    <span>SET</span>
                    <span>WEIGHT</span>
                    <span>REPS</span>
                    <span>VOLUME</span>
                  </div>
                  {/* Sets */}
                  {sets.map((set) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-sm py-1.5 border-t border-neutral-800"
                    >
                      <span className="text-neutral-400">{set.set_number}</span>
                      <span>{set.weight} lbs</span>
                      <span>{set.reps}</span>
                      <span className="text-neutral-400">
                        {(set.weight * set.reps).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
