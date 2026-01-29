"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Trash2, Edit2, ChevronRight } from "lucide-react";
import { 
  listRoutines, 
  createRoutine, 
  updateRoutine, 
  deleteRoutine, 
  searchExercises,
  getDayName,
  DAY_NAMES,
  type Routine, 
  type RoutineInput,
  type Exercise 
} from "@/lib/api";

interface RoutineExerciseForm {
  exercise_id: string;
  exercise_name: string;
  order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDay, setFormDay] = useState(1);
  const [formExercises, setFormExercises] = useState<RoutineExerciseForm[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Exercise search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, []);

  async function loadRoutines() {
    try {
      const data = await listRoutines();
      setRoutines(data);
    } catch (error) {
      console.error("Failed to load routines:", error);
    } finally {
      setLoading(false);
    }
  }

  const openCreateDialog = () => {
    setEditingRoutine(null);
    setFormName("");
    setFormDay(1);
    setFormExercises([]);
    setDialogOpen(true);
  };

  const openEditDialog = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormName(routine.name);
    setFormDay(routine.schedule_day_index);
    setFormExercises(
      routine.exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order: ex.order,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
      }))
    );
    setDialogOpen(true);
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
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addExercise = (exercise: Exercise) => {
    if (formExercises.find((e) => e.exercise_id === exercise.id)) return;
    setFormExercises([
      ...formExercises,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        order: formExercises.length,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 12,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeExercise = (exerciseId: string) => {
    setFormExercises(formExercises.filter((e) => e.exercise_id !== exerciseId));
  };

  const updateExerciseTargets = (
    exerciseId: string,
    field: "target_sets" | "target_reps_min" | "target_reps_max",
    value: number
  ) => {
    setFormExercises(
      formExercises.map((e) =>
        e.exercise_id === exerciseId ? { ...e, [field]: value } : e
      )
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const data: RoutineInput = {
      name: formName,
      schedule_day_index: formDay,
      exercises: formExercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        order: i,
        target_sets: e.target_sets,
        target_reps_min: e.target_reps_min,
        target_reps_max: e.target_reps_max,
      })),
    };

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, data);
      } else {
        await createRoutine(data);
      }
      await loadRoutines();
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save routine:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this routine?")) return;
    try {
      await deleteRoutine(id);
      setRoutines(routines.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete routine:", error);
    }
  };

  // Group routines by day
  const routinesByDay = DAY_NAMES.map((day, index) => ({
    day,
    index,
    routines: routines.filter((r) => r.schedule_day_index === index),
  }));

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Routines</h1>
            <p className="text-neutral-400 mt-1">Your weekly workout schedule</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                New Routine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-800">
              <DialogHeader>
                <DialogTitle>
                  {editingRoutine ? "Edit Routine" : "Create Routine"}
                </DialogTitle>
                <DialogDescription>
                  Set up your workout for a specific day of the week.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Routine Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Push Day, Leg Day"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-neutral-800 border-neutral-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="day">Schedule Day</Label>
                  <select
                    id="day"
                    value={formDay}
                    onChange={(e) => setFormDay(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md bg-neutral-800 border border-neutral-700 text-sm"
                  >
                    {DAY_NAMES.map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Exercises</Label>
                  
                  {/* Exercise list */}
                  <div className="space-y-2">
                    {formExercises.map((ex, index) => (
                      <div
                        key={ex.exercise_id}
                        className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700"
                      >
                        <span className="text-sm text-neutral-500 w-5">{index + 1}.</span>
                        <span className="flex-1 text-sm font-medium truncate">{ex.exercise_name}</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={ex.target_sets}
                          onChange={(e) => updateExerciseTargets(ex.exercise_id, "target_sets", Number(e.target.value))}
                          className="w-12 h-8 text-center text-sm bg-neutral-700 border-neutral-600"
                        />
                        <span className="text-neutral-500 text-sm">×</span>
                        <Input
                          type="number"
                          min={1}
                          value={ex.target_reps_min}
                          onChange={(e) => updateExerciseTargets(ex.exercise_id, "target_reps_min", Number(e.target.value))}
                          className="w-12 h-8 text-center text-sm bg-neutral-700 border-neutral-600"
                        />
                        <span className="text-neutral-500 text-sm">-</span>
                        <Input
                          type="number"
                          min={1}
                          value={ex.target_reps_max}
                          onChange={(e) => updateExerciseTargets(ex.exercise_id, "target_reps_max", Number(e.target.value))}
                          className="w-12 h-8 text-center text-sm bg-neutral-700 border-neutral-600"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(ex.exercise_id)}
                          className="h-8 w-8 text-neutral-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add exercise search */}
                  <div className="relative">
                    <Input
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                    />
                    {(searchResults.length > 0 || searching) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {searching ? (
                          <div className="p-3 text-center text-neutral-400">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Searching...
                          </div>
                        ) : (
                          searchResults.map((ex) => (
                            <button
                              key={ex.id}
                              onClick={() => addExercise(ex)}
                              className="w-full px-3 py-2 text-left hover:bg-neutral-700 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm">{ex.name}</span>
                              <span className="text-xs text-neutral-500">{ex.muscle_group}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Routine"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Weekly schedule */}
        <div className="space-y-4">
          {routinesByDay.map(({ day, index, routines: dayRoutines }) => (
            <div key={day}>
              <h3 className="text-sm font-medium text-neutral-400 mb-2">{day}</h3>
              {dayRoutines.length === 0 ? (
                <Card className="border-neutral-800 bg-neutral-900/30 border-dashed">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-neutral-500">Rest day</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-neutral-400"
                      onClick={() => {
                        openCreateDialog();
                        setFormDay(index);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add routine
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                dayRoutines.map((routine) => (
                  <Card key={routine.id} className="border-neutral-800 bg-neutral-900/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{routine.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400"
                            onClick={() => openEditDialog(routine)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-red-400"
                            onClick={() => handleDelete(routine.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {routine.exercises.slice(0, 3).map((ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className="text-neutral-300">{ex.exercise_name}</span>
                            <span className="text-neutral-500">
                              {ex.target_sets} × {ex.target_reps_min}-{ex.target_reps_max}
                            </span>
                          </div>
                        ))}
                        {routine.exercises.length > 3 && (
                          <p className="text-sm text-neutral-500 pt-1">
                            +{routine.exercises.length - 3} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
