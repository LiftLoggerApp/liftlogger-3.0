"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Calendar, Dumbbell, Loader2 } from "lucide-react";
import { getActiveWorkout, listRoutines, startWorkout, getDayName, type Routine, type Workout } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [todayRoutine, setTodayRoutine] = useState<Routine | null>(null);
  const [starting, setStarting] = useState(false);

  const today = new Date().getDay();
  const dayName = getDayName(today);

  useEffect(() => {
    async function load() {
      try {
        const [workout, routines] = await Promise.all([
          getActiveWorkout(),
          listRoutines(),
        ]);
        setActiveWorkout(workout);
        
        // Find routine for today
        const routine = routines.find((r) => r.schedule_day_index === today);
        setTodayRoutine(routine || null);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  const handleStartWorkout = async (routineId?: string) => {
    setStarting(true);
    try {
      const workout = await startWorkout(routineId);
      router.push(`/workout/${workout.id}`);
    } catch (error) {
      console.error("Failed to start workout:", error);
      setStarting(false);
    }
  };

  const handleResumeWorkout = () => {
    if (activeWorkout) {
      router.push(`/workout/${activeWorkout.id}`);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Happy {dayName}!</h1>
          <p className="text-neutral-400 mt-1">Ready to crush it?</p>
        </div>

        {/* Active Workout Card */}
        {activeWorkout && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">Workout in Progress</span>
              </div>
              <CardTitle className="text-lg">
                {activeWorkout.routine_name || "Quick Workout"}
              </CardTitle>
              <CardDescription>
                Started at {new Date(activeWorkout.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleResumeWorkout} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Resume Workout
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Routine */}
        {!activeWorkout && todayRoutine && (
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-neutral-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Today&apos;s Scheduled Workout</span>
              </div>
              <CardTitle className="text-xl">{todayRoutine.name}</CardTitle>
              <CardDescription>
                {todayRoutine.exercises.length} exercises
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exercise preview */}
              <div className="space-y-2">
                {todayRoutine.exercises.slice(0, 4).map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/50"
                  >
                    <span className="text-sm">{ex.exercise_name}</span>
                    <span className="text-xs text-neutral-500">
                      {ex.target_sets} × {ex.target_reps_min}-{ex.target_reps_max}
                    </span>
                  </div>
                ))}
                {todayRoutine.exercises.length > 4 && (
                  <p className="text-sm text-neutral-500 text-center py-1">
                    +{todayRoutine.exercises.length - 4} more exercises
                  </p>
                )}
              </div>

              <Button
                onClick={() => handleStartWorkout(todayRoutine.id)}
                disabled={starting}
                className="w-full"
                size="lg"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start {todayRoutine.name}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No routine for today */}
        {!activeWorkout && !todayRoutine && (
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-neutral-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">No workout scheduled for today</span>
              </div>
              <CardTitle className="text-xl">Rest Day?</CardTitle>
              <CardDescription>
                You don&apos;t have a routine set for {dayName}. You can still start a quick workout or set up your schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => handleStartWorkout()}
                disabled={starting}
                className="w-full"
                size="lg"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Start Empty Workout
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/routines")}
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Set Up Routines
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
