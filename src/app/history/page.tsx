"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Dumbbell, Clock, ChevronRight } from "lucide-react";
import { getHistory, getWorkout, formatDuration, type WorkoutSummary } from "@/lib/api";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getHistory(20, 0);
      setWorkouts(data);
      setHasMore(data.length === 20);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await getHistory(20, workouts.length);
      setWorkouts([...workouts, ...data]);
      setHasMore(data.length === 20);
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const date = new Date(workout.start_time).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(workout);
    return groups;
  }, {} as Record<string, WorkoutSummary[]>);

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
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-neutral-400 mt-1">Your completed workouts</p>
        </div>

        {workouts.length === 0 ? (
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardContent className="py-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">No workouts yet</h3>
              <p className="text-neutral-500 mb-4">
                Complete your first workout to see it here.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Start a Workout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedWorkouts).map(([date, dayWorkouts]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(dayWorkouts[0].start_time)}
                </h3>
                <div className="space-y-3">
                  {dayWorkouts.map((workout) => (
                    <Card
                      key={workout.id}
                      className="border-neutral-800 bg-neutral-900/50 cursor-pointer hover:border-neutral-700 transition-colors"
                      onClick={() => router.push(`/history/${workout.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {workout.routine_name || "Quick Workout"}
                          </CardTitle>
                          <ChevronRight className="w-5 h-5 text-neutral-500" />
                        </div>
                        <p className="text-sm text-neutral-500">
                          {formatTime(workout.start_time)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(workout.start_time, workout.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <Dumbbell className="w-4 h-4" />
                            <span>{workout.total_sets} sets</span>
                          </div>
                          <div className="text-neutral-400 ml-auto">
                            {workout.total_volume.toLocaleString()} lbs
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
