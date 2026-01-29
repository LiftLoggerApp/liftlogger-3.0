"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WorkoutTimer } from "@/components/workout-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, 
  Check, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Flag, 
  X,
  Search 
} from "lucide-react";
import { 
  getWorkout, 
  logSet, 
  finishWorkout, 
  searchExercises,
  getExerciseHistory,
  listRoutines,
  type Exercise 
} from "@/lib/api";

interface SetData {
  id?: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  logged: boolean;
}

interface ExerciseData {
  exercise_id: string;
  exercise_name: string;
  sets: SetData[];
  previousBest?: { weight: number; reps: number };
  expanded: boolean;
}

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: workoutId } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<{
    id: string;
    start_time: string;
    routine_name: string | null;
    status: string;
  } | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  
  // Add exercise
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadWorkout();
  }, [workoutId]);

  async function loadWorkout() {
    try {
      const data = await getWorkout(workoutId);
      setWorkout({
        id: data.id,
        start_time: data.start_time,
        routine_name: data.routine_name,
        status: data.status,
      });

      // Group existing sets by exercise
      const exerciseMap = new Map<string, ExerciseData>();
      
      // If from a routine, get the routine exercises
      if (data.routine_name) {
        const routines = await listRoutines();
        const routine = routines.find(r => r.name === data.routine_name);
        if (routine) {
          for (const ex of routine.exercises) {
            exerciseMap.set(ex.exercise_id, {
              exercise_id: ex.exercise_id,
              exercise_name: ex.exercise_name,
              sets: Array.from({ length: ex.target_sets }, (_, i) => ({
                set_number: i + 1,
                weight: 0,
                reps: 0,
                logged: false,
              })),
              expanded: false,
            });
          }
        }
      }

      // Add logged sets
      for (const set of data.workout_sets || []) {
        const exerciseId = set.exercise_id;
        let exercise = exerciseMap.get(exerciseId);
        
        if (!exercise) {
          exercise = {
            exercise_id: exerciseId,
            exercise_name: set.exercises?.name || "Unknown",
            sets: [],
            expanded: false,
          };
          exerciseMap.set(exerciseId, exercise);
        }

        // Update or add set
        const existingSetIndex = exercise.sets.findIndex(s => s.set_number === set.set_number);
        if (existingSetIndex >= 0) {
          exercise.sets[existingSetIndex] = {
            id: set.id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe ?? undefined,
            logged: true,
          };
        } else {
          exercise.sets.push({
            id: set.id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe ?? undefined,
            logged: true,
          });
        }
      }

      // Sort sets and fetch previous bests
      const exerciseArray = Array.from(exerciseMap.values());
      for (const ex of exerciseArray) {
        ex.sets.sort((a, b) => a.set_number - b.set_number);
        // Expand first unlogged exercise
        if (!ex.sets.every(s => s.logged)) {
          ex.expanded = true;
          break;
        }
      }

      setExercises(exerciseArray);

      // Fetch previous bests for each exercise
      for (const ex of exerciseArray) {
        try {
          const history = await getExerciseHistory(ex.exercise_id);
          if (history.length > 0) {
            const best = history.reduce((max, s) => 
              s.weight > max.weight ? s : max
            , history[0]);
            ex.previousBest = { weight: best.weight, reps: best.reps };
          }
        } catch {
          // Ignore history errors
        }
      }
      setExercises([...exerciseArray]);

    } catch (error) {
      console.error("Failed to load workout:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const toggleExercise = (exerciseId: string) => {
    setExercises(exercises.map(ex => 
      ex.exercise_id === exerciseId ? { ...ex, expanded: !ex.expanded } : ex
    ));
  };

  const updateSet = (exerciseId: string, setNumber: number, field: "weight" | "reps", value: number) => {
    setExercises(exercises.map(ex => {
      if (ex.exercise_id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => 
          s.set_number === setNumber ? { ...s, [field]: value } : s
        ),
      };
    }));
  };

  const handleLogSet = async (exerciseId: string, set: SetData) => {
    if (set.weight <= 0 || set.reps <= 0) return;
    
    try {
      await logSet(workoutId, {
        exercise_id: exerciseId,
        set_number: set.set_number,
        weight: set.weight,
        reps: set.reps,
      });

      setExercises(exercises.map(ex => {
        if (ex.exercise_id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(s => 
            s.set_number === set.set_number ? { ...s, logged: true } : s
          ),
        };
      }));
    } catch (error) {
      console.error("Failed to log set:", error);
    }
  };

  const addSetToExercise = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.exercise_id !== exerciseId) return ex;
      const nextSetNumber = Math.max(0, ...ex.sets.map(s => s.set_number)) + 1;
      return {
        ...ex,
        sets: [...ex.sets, {
          set_number: nextSetNumber,
          weight: ex.sets[ex.sets.length - 1]?.weight || 0,
          reps: ex.sets[ex.sets.length - 1]?.reps || 0,
          logged: false,
        }],
      };
    }));
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchExercises(query);
      // Filter out already added exercises
      const existingIds = new Set(exercises.map(e => e.exercise_id));
      setSearchResults(results.filter(r => !existingIds.has(r.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addExercise = (exercise: Exercise) => {
    setExercises([...exercises, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: [{ set_number: 1, weight: 0, reps: 0, logged: false }],
      expanded: true,
    }]);
    setShowAddExercise(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await finishWorkout(workoutId);
      router.push("/history");
    } catch (error) {
      console.error("Failed to finish workout:", error);
      setFinishing(false);
    }
  };

  const totalSetsLogged = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.logged).length,
    0
  );

  const totalVolume = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.logged).reduce(
      (setSum, s) => setSum + s.weight * s.reps,
      0
    ),
    0
  );

  if (loading || !workout) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      </AppShell>
    );
  }

  if (workout.status !== "in_progress") {
    router.push(`/history`);
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="sticky top-14 z-40 -mx-4 px-4 py-3 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">
                {workout.routine_name || "Quick Workout"}
              </h1>
              <WorkoutTimer startTime={workout.start_time} className="mt-1" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFinishDialog(true)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Flag className="w-4 h-4 mr-2" />
              Finish
            </Button>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <Card key={exercise.exercise_id} className="border-neutral-800 bg-neutral-900/50 overflow-hidden">
              <CardHeader
                className="pb-2 cursor-pointer"
                onClick={() => toggleExercise(exercise.exercise_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{exercise.exercise_name}</CardTitle>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {exercise.sets.filter(s => s.logged).length}/{exercise.sets.length} sets
                      {exercise.previousBest && (
                        <span className="ml-2">
                          • Previous: {exercise.previousBest.weight}×{exercise.previousBest.reps}
                        </span>
                      )}
                    </p>
                  </div>
                  {exercise.expanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                  )}
                </div>
              </CardHeader>

              {exercise.expanded && (
                <CardContent className="pt-2">
                  {/* Set headers */}
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 mb-2 text-xs text-neutral-500 font-medium">
                    <span>SET</span>
                    <span>WEIGHT</span>
                    <span>REPS</span>
                    <span></span>
                  </div>

                  {/* Sets */}
                  <div className="space-y-2">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.set_number}
                        className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center ${
                          set.logged ? "opacity-60" : ""
                        }`}
                      >
                        <span className="text-sm text-neutral-400 font-medium">
                          {set.set_number}
                        </span>
                        <Input
                          type="number"
                          placeholder="lbs"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(exercise.exercise_id, set.set_number, "weight", Number(e.target.value))}
                          disabled={set.logged}
                          className="h-10 bg-neutral-800 border-neutral-700 text-center"
                        />
                        <Input
                          type="number"
                          placeholder="reps"
                          value={set.reps || ""}
                          onChange={(e) => updateSet(exercise.exercise_id, set.set_number, "reps", Number(e.target.value))}
                          disabled={set.logged}
                          className="h-10 bg-neutral-800 border-neutral-700 text-center"
                        />
                        {set.logged ? (
                          <div className="flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleLogSet(exercise.exercise_id, set)}
                            disabled={set.weight <= 0 || set.reps <= 0}
                            className="h-10 w-10"
                          >
                            <Check className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add set button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addSetToExercise(exercise.exercise_id)}
                    className="w-full mt-3 text-neutral-400"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Set
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Add exercise button */}
          <Button
            variant="outline"
            onClick={() => setShowAddExercise(true)}
            className="w-full border-dashed border-neutral-700 text-neutral-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        {/* Add exercise dialog */}
        <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
          <DialogContent className="bg-neutral-900 border-neutral-800">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>
                Search for an exercise to add to this workout.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-neutral-800 border-neutral-700"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searching ? (
                <div className="py-8 text-center text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="w-full px-3 py-3 text-left rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-sm text-neutral-500">{ex.muscle_group}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <p className="py-8 text-center text-neutral-500">No exercises found</p>
              ) : (
                <p className="py-8 text-center text-neutral-500">Type to search...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Finish dialog */}
        <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <DialogContent className="bg-neutral-900 border-neutral-800">
            <DialogHeader>
              <DialogTitle>Finish Workout?</DialogTitle>
              <DialogDescription>
                You&apos;re about to complete this workout.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">Duration</span>
                <WorkoutTimer startTime={workout.start_time} />
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">Sets Logged</span>
                <span className="font-medium">{totalSetsLogged}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-400">Total Volume</span>
                <span className="font-medium">{totalVolume.toLocaleString()} lbs</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
                Keep Going
              </Button>
              <Button onClick={handleFinish} disabled={finishing}>
                {finishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Finish Workout
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
