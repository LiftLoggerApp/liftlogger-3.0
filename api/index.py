from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
from supabase import create_client, Client
from jose import jwt, JWTError

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return create_client(url, key)


# Auth dependency
async def get_current_user(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase),
) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        token = authorization.replace("Bearer ", "")
        # Verify JWT using Supabase JWT secret
        jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "")
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_id, "email": payload.get("email")}
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ============ MODELS ============

class ExerciseOut(BaseModel):
    id: str
    name: str
    muscle_group: str
    category: str


class RoutineExerciseIn(BaseModel):
    exercise_id: str
    order: int
    target_sets: int
    target_reps_min: int
    target_reps_max: int


class RoutineIn(BaseModel):
    name: str
    schedule_day_index: int  # 0=Sunday, 1=Monday, etc.
    exercises: List[RoutineExerciseIn]


class RoutineOut(BaseModel):
    id: str
    name: str
    schedule_day_index: int
    exercises: List[dict]


class SetLogIn(BaseModel):
    exercise_id: str
    set_number: int
    weight: float
    reps: int
    rpe: Optional[float] = None


class WorkoutOut(BaseModel):
    id: str
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    routine_name: Optional[str]


# ============ HEALTH CHECK ============

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ============ EXERCISES ============

@app.get("/api/exercises", response_model=List[ExerciseOut])
async def list_exercises(
    search: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("exercises").select("*")
    if search:
        query = query.ilike("name", f"%{search}%")
    result = query.limit(50).execute()
    return result.data


@app.get("/api/exercises/search", response_model=List[ExerciseOut])
async def search_exercises(
    q: str,
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("exercises").select("*").ilike("name", f"%{q}%").limit(20).execute()
    return result.data


# ============ ROUTINES ============

@app.get("/api/routines", response_model=List[RoutineOut])
async def list_routines(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("routines").select(
        "*, routine_exercises(*, exercises(*))"
    ).eq("user_id", user["id"]).order("schedule_day_index").execute()
    
    routines = []
    for r in result.data:
        exercises = []
        for re in r.get("routine_exercises", []):
            exercises.append({
                "id": re["id"],
                "exercise_id": re["exercise_id"],
                "exercise_name": re["exercises"]["name"] if re.get("exercises") else "",
                "order": re["order"],
                "target_sets": re["target_sets"],
                "target_reps_min": re["target_reps_min"],
                "target_reps_max": re["target_reps_max"],
            })
        routines.append(RoutineOut(
            id=r["id"],
            name=r["name"],
            schedule_day_index=r["schedule_day_index"],
            exercises=sorted(exercises, key=lambda x: x["order"]),
        ))
    return routines


@app.post("/api/routines", response_model=RoutineOut)
async def create_routine(
    routine: RoutineIn,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Create routine
    routine_result = supabase.table("routines").insert({
        "user_id": user["id"],
        "name": routine.name,
        "schedule_day_index": routine.schedule_day_index,
    }).execute()
    
    routine_id = routine_result.data[0]["id"]
    
    # Add exercises
    exercises_data = []
    for ex in routine.exercises:
        exercises_data.append({
            "routine_id": routine_id,
            "exercise_id": ex.exercise_id,
            "order": ex.order,
            "target_sets": ex.target_sets,
            "target_reps_min": ex.target_reps_min,
            "target_reps_max": ex.target_reps_max,
        })
    
    if exercises_data:
        supabase.table("routine_exercises").insert(exercises_data).execute()
    
    return RoutineOut(
        id=routine_id,
        name=routine.name,
        schedule_day_index=routine.schedule_day_index,
        exercises=[],
    )


@app.put("/api/routines/{routine_id}", response_model=RoutineOut)
async def update_routine(
    routine_id: str,
    routine: RoutineIn,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify ownership
    existing = supabase.table("routines").select("*").eq("id", routine_id).eq("user_id", user["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    # Update routine
    supabase.table("routines").update({
        "name": routine.name,
        "schedule_day_index": routine.schedule_day_index,
    }).eq("id", routine_id).execute()
    
    # Delete old exercises and add new ones
    supabase.table("routine_exercises").delete().eq("routine_id", routine_id).execute()
    
    exercises_data = []
    for ex in routine.exercises:
        exercises_data.append({
            "routine_id": routine_id,
            "exercise_id": ex.exercise_id,
            "order": ex.order,
            "target_sets": ex.target_sets,
            "target_reps_min": ex.target_reps_min,
            "target_reps_max": ex.target_reps_max,
        })
    
    if exercises_data:
        supabase.table("routine_exercises").insert(exercises_data).execute()
    
    return RoutineOut(
        id=routine_id,
        name=routine.name,
        schedule_day_index=routine.schedule_day_index,
        exercises=[],
    )


@app.delete("/api/routines/{routine_id}")
async def delete_routine(
    routine_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify ownership
    existing = supabase.table("routines").select("*").eq("id", routine_id).eq("user_id", user["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    supabase.table("routine_exercises").delete().eq("routine_id", routine_id).execute()
    supabase.table("routines").delete().eq("id", routine_id).execute()
    
    return {"status": "deleted"}


# ============ WORKOUTS ============

@app.get("/api/workouts/active", response_model=Optional[WorkoutOut])
async def get_active_workout(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("workouts").select("*").eq("user_id", user["id"]).eq("status", "in_progress").limit(1).execute()
    if not result.data:
        return None
    w = result.data[0]
    return WorkoutOut(
        id=w["id"],
        start_time=w["start_time"],
        end_time=w.get("end_time"),
        status=w["status"],
        routine_name=w.get("routine_name"),
    )


@app.post("/api/workouts/start", response_model=WorkoutOut)
async def start_workout(
    routine_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Check for existing active workout
    existing = supabase.table("workouts").select("*").eq("user_id", user["id"]).eq("status", "in_progress").execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="You already have an active workout")
    
    routine_name = None
    if routine_id:
        routine = supabase.table("routines").select("name").eq("id", routine_id).execute()
        if routine.data:
            routine_name = routine.data[0]["name"]
    
    result = supabase.table("workouts").insert({
        "user_id": user["id"],
        "start_time": datetime.utcnow().isoformat(),
        "status": "in_progress",
        "routine_id": routine_id,
        "routine_name": routine_name,
    }).execute()
    
    w = result.data[0]
    return WorkoutOut(
        id=w["id"],
        start_time=w["start_time"],
        end_time=None,
        status=w["status"],
        routine_name=routine_name,
    )


@app.get("/api/workouts/{workout_id}")
async def get_workout(
    workout_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("workouts").select("*, workout_sets(*, exercises(*))").eq("id", workout_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Workout not found")
    return result.data[0]


@app.post("/api/workouts/{workout_id}/sets")
async def log_set(
    workout_id: str,
    set_data: SetLogIn,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify workout ownership
    workout = supabase.table("workouts").select("*").eq("id", workout_id).eq("user_id", user["id"]).execute()
    if not workout.data:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout.data[0]["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Workout is not active")
    
    result = supabase.table("workout_sets").insert({
        "workout_id": workout_id,
        "exercise_id": set_data.exercise_id,
        "set_number": set_data.set_number,
        "weight": set_data.weight,
        "reps": set_data.reps,
        "rpe": set_data.rpe,
    }).execute()
    
    return result.data[0]


@app.post("/api/workouts/{workout_id}/finish", response_model=WorkoutOut)
async def finish_workout(
    workout_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify workout ownership
    workout = supabase.table("workouts").select("*").eq("id", workout_id).eq("user_id", user["id"]).execute()
    if not workout.data:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout.data[0]["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Workout is not active")
    
    result = supabase.table("workouts").update({
        "end_time": datetime.utcnow().isoformat(),
        "status": "completed",
    }).eq("id", workout_id).execute()
    
    w = result.data[0]
    return WorkoutOut(
        id=w["id"],
        start_time=w["start_time"],
        end_time=w["end_time"],
        status=w["status"],
        routine_name=w.get("routine_name"),
    )


# ============ HISTORY ============

@app.get("/api/history")
async def get_history(
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("workouts").select(
        "*, workout_sets(id, exercise_id, weight, reps)"
    ).eq("user_id", user["id"]).eq("status", "completed").order("start_time", desc=True).range(offset, offset + limit - 1).execute()
    
    workouts = []
    for w in result.data:
        total_volume = sum(s["weight"] * s["reps"] for s in w.get("workout_sets", []))
        total_sets = len(w.get("workout_sets", []))
        workouts.append({
            "id": w["id"],
            "start_time": w["start_time"],
            "end_time": w["end_time"],
            "routine_name": w.get("routine_name"),
            "total_volume": total_volume,
            "total_sets": total_sets,
        })
    
    return workouts


@app.get("/api/exercises/{exercise_id}/history")
async def get_exercise_history(
    exercise_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get previous sets for an exercise (for showing 'Previous' column)"""
    result = supabase.table("workout_sets").select(
        "*, workouts!inner(user_id, start_time, status)"
    ).eq("exercise_id", exercise_id).eq("workouts.user_id", user["id"]).eq("workouts.status", "completed").order("workouts.start_time", desc=True).limit(10).execute()
    
    return result.data
