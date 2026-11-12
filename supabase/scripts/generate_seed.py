#!/usr/bin/env python3
# Regenerates the reference-data migration (40 exercises + 3 starter routines).
# Usage: python3 supabase/scripts/generate_seed.py > supabase/migrations/<new_version>_seed_update.sql
# Ids are UUIDv5, so existing rows keep their ids and the inserts stay idempotent.
import uuid, sys
NS = uuid.UUID("6f1c9a52-3d7e-4b8a-9c21-0e5d4f7a1b33")  # GymBuddy namespace
def uid(kind, key): return str(uuid.uuid5(NS, f"gymbuddy/{kind}/{key}"))
def q(s): return "'" + s.replace("'", "''") + "'"
def arr(xs): return "array[" + ", ".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"

# slug, name, primary, secondary, equipment, category, tracking, instructions (own words)
E = [
 # chest (5)
 ("barbell-bench-press","Barbell Bench Press","chest",["triceps","shoulders"],"barbell","compound","weight_reps","Lie on the bench with eyes under the bar. Grip slightly wider than shoulders, lower the bar to mid-chest with elbows about 45 degrees from your body, then press back up."),
 ("incline-dumbbell-press","Incline Dumbbell Press","chest",["shoulders","triceps"],"dumbbell","compound","weight_reps","Set the bench to 30-45 degrees. Start with dumbbells over the upper chest, lower them to the sides of the chest, then press up and slightly together."),
 ("dumbbell-bench-press","Dumbbell Bench Press","chest",["triceps","shoulders"],"dumbbell","compound","weight_reps","Lie flat holding dumbbells above the chest. Lower under control until the elbows are just below the bench, then press back up."),
 ("push-up","Push-Up","chest",["triceps","shoulders","core"],"bodyweight","compound","bodyweight_reps","Hands under the shoulders, body in a straight line from head to heels. Lower your chest to just above the floor and push back up."),
 ("cable-fly","Cable Fly","chest",["shoulders"],"cable","isolation","weight_reps","Stand between two high pulleys with a slight bend in the elbows. Bring the handles together in front of the chest in a wide arc, then return slowly."),
 # back (6)
 ("deadlift","Deadlift","back",["hamstrings","glutes","forearms"],"barbell","compound","weight_reps","Bar over mid-foot, hips back, back flat. Push the floor away to stand tall with the bar close to your legs, then hinge back down with control."),
 ("pull-up","Pull-Up","back",["biceps","forearms"],"bodyweight","compound","bodyweight_reps","Hang from the bar with an overhand grip. Pull your chest toward the bar by driving the elbows down, then lower to a full hang."),
 ("lat-pulldown","Lat Pulldown","back",["biceps"],"cable","compound","weight_reps","Sit with thighs under the pads. Pull the bar to the upper chest while keeping the torso tall, then let it rise until the arms are straight."),
 ("barbell-row","Barbell Row","back",["biceps","shoulders"],"barbell","compound","weight_reps","Hinge forward with a flat back. Row the bar to the lower ribs, squeezing the shoulder blades together, then lower it under control."),
 ("seated-cable-row","Seated Cable Row","back",["biceps"],"cable","compound","weight_reps","Sit tall with knees slightly bent. Pull the handle to your stomach, pause with shoulder blades squeezed, and return without rounding forward."),
 ("one-arm-dumbbell-row","One-Arm Dumbbell Row","back",["biceps"],"dumbbell","compound","weight_reps","Support one hand and knee on a bench. Row the dumbbell toward the hip, keeping the torso still, then lower until the arm is straight."),
 # shoulders (5)
 ("overhead-press","Overhead Press","shoulders",["triceps","core"],"barbell","compound","weight_reps","Stand with the bar on the front of the shoulders. Brace and press it straight overhead, moving your head back slightly to clear the bar, then lower."),
 ("dumbbell-shoulder-press","Dumbbell Shoulder Press","shoulders",["triceps"],"dumbbell","compound","weight_reps","Seated or standing, start with dumbbells at shoulder height. Press overhead until the arms are straight, then lower slowly."),
 ("lateral-raise","Lateral Raise","shoulders",[],"dumbbell","isolation","weight_reps","With a slight elbow bend, raise the dumbbells out to the sides until roughly shoulder height. Lower slowly without swinging."),
 ("face-pull","Face Pull","shoulders",["back"],"cable","isolation","weight_reps","Use a rope at face height. Pull toward your eyes with elbows high, separating the rope ends, then return under control."),
 ("rear-delt-fly","Rear Delt Fly","shoulders",["back"],"dumbbell","isolation","weight_reps","Hinge forward with a flat back. Raise the dumbbells out to the sides leading with the elbows, then lower slowly."),
 # biceps (3)
 ("barbell-curl","Barbell Curl","biceps",["forearms"],"barbell","isolation","weight_reps","Stand with elbows at your sides. Curl the bar toward the shoulders without swinging, then lower until the arms are straight."),
 ("dumbbell-curl","Dumbbell Curl","biceps",["forearms"],"dumbbell","isolation","weight_reps","Palms facing forward, curl the dumbbells up while keeping the upper arms still, then lower with control."),
 ("hammer-curl","Hammer Curl","biceps",["forearms"],"dumbbell","isolation","weight_reps","Hold dumbbells with palms facing each other. Curl up keeping that neutral grip, then lower slowly."),
 # triceps (4)
 ("triceps-pushdown","Triceps Pushdown","triceps",[],"cable","isolation","weight_reps","Elbows pinned at your sides, push the bar or rope down until the arms are straight, then let it rise to about chest height."),
 ("overhead-triceps-extension","Overhead Triceps Extension","triceps",[],"dumbbell","isolation","weight_reps","Hold one dumbbell overhead with both hands. Lower it behind the head by bending the elbows, then extend back up."),
 ("close-grip-bench-press","Close-Grip Bench Press","triceps",["chest","shoulders"],"barbell","compound","weight_reps","Bench press with hands about shoulder-width apart and elbows tucked closer to the body."),
 ("triceps-dip","Triceps Dip","triceps",["chest","shoulders"],"bodyweight","compound","bodyweight_reps","On parallel bars, keep the torso upright and lower until the elbows reach about 90 degrees, then press back up."),
 # quads (7)
 ("back-squat","Back Squat","quads",["glutes","hamstrings","core"],"barbell","compound","weight_reps","Bar across the upper back, feet shoulder-width. Sit down and back until the thighs are at least parallel, keeping the chest up, then stand."),
 ("front-squat","Front Squat","quads",["glutes","core"],"barbell","compound","weight_reps","Rest the bar on the front of the shoulders with elbows high. Squat down with an upright torso, then drive back up."),
 ("goblet-squat","Goblet Squat","quads",["glutes","core"],"dumbbell","compound","weight_reps","Hold a dumbbell or kettlebell at the chest. Squat between your knees with the chest up, then stand. A good first squat to learn."),
 ("leg-press","Leg Press","quads",["glutes","hamstrings"],"machine","compound","weight_reps","Feet shoulder-width on the platform. Lower until the knees reach about 90 degrees without the lower back lifting, then press out."),
 ("leg-extension","Leg Extension","quads",[],"machine","isolation","weight_reps","Pad on the lower shins. Straighten the legs fully, pause briefly, then lower slowly."),
 ("walking-lunge","Walking Lunge","quads",["glutes","hamstrings"],"dumbbell","compound","weight_reps","Step forward and lower until both knees are about 90 degrees, then step through into the next lunge. Count reps per leg."),
 ("bulgarian-split-squat","Bulgarian Split Squat","quads",["glutes"],"dumbbell","compound","weight_reps","Rear foot on a bench behind you. Lower the back knee toward the floor, keeping the front heel down, then stand. Count reps per leg."),
 # hamstrings (2)
 ("romanian-deadlift","Romanian Deadlift","hamstrings",["glutes","back"],"barbell","compound","weight_reps","With soft knees, push the hips back and slide the bar down the thighs until you feel a hamstring stretch, then drive the hips forward."),
 ("leg-curl","Leg Curl","hamstrings",[],"machine","isolation","weight_reps","Pad just above the heels. Curl the heels toward your glutes, pause, then lower under control."),
 # glutes (2)
 ("hip-thrust","Hip Thrust","glutes",["hamstrings"],"barbell","compound","weight_reps","Upper back on a bench, bar across the hips. Drive through the heels to lift the hips until the body is flat, squeeze, then lower."),
 ("glute-bridge","Glute Bridge","glutes",["hamstrings"],"bodyweight","isolation","bodyweight_reps","Lie on your back with knees bent. Lift the hips by squeezing the glutes until knees, hips and shoulders line up, then lower."),
 # calves (2)
 ("standing-calf-raise","Standing Calf Raise","calves",[],"machine","isolation","weight_reps","Balls of the feet on the edge of a step. Rise as high as possible, pause, then lower the heels below the step."),
 ("seated-calf-raise","Seated Calf Raise","calves",[],"machine","isolation","weight_reps","Seated with the pad on the knees. Raise the heels as high as possible, then lower for a full stretch."),
 # core (4)
 ("plank","Plank","core",["shoulders"],"bodyweight","isolation","duration","Forearms under the shoulders, body straight from head to heels. Brace the stomach and hold. Logged in seconds."),
 ("hanging-leg-raise","Hanging Leg Raise","core",["forearms"],"bodyweight","isolation","bodyweight_reps","Hang from a bar. Raise the legs by curling the pelvis up, avoid swinging, then lower slowly. Bend the knees to make it easier."),
 ("cable-crunch","Cable Crunch","core",[],"cable","isolation","weight_reps","Kneel facing a high pulley holding a rope by your head. Curl the ribs toward the hips, then return slowly."),
 ("dead-bug","Dead Bug","core",[],"bodyweight","isolation","bodyweight_reps","Lie on your back with arms up and knees at 90 degrees. Lower the opposite arm and leg while keeping the lower back flat, then switch."),
]
assert len(E) == 40, len(E)
slugs = {e[0] for e in E}

# routines: key, name, description, days, {day_index: [(slug, sets, rmin, rmax, rest)]}
R = [
 ("push-pull-legs","Push / Pull / Legs","A 3-day split: chest, shoulders and triceps; back and biceps; then legs. Run it 3 or 6 days a week.",
  ["Push","Pull","Legs"], {
   0:[("barbell-bench-press",4,6,8,150),("overhead-press",3,8,10,120),("incline-dumbbell-press",3,8,12,90),("lateral-raise",3,12,15,60),("triceps-pushdown",3,10,12,60),("overhead-triceps-extension",3,10,12,60)],
   1:[("deadlift",3,5,5,180),("pull-up",3,6,10,120),("barbell-row",3,8,10,120),("seated-cable-row",3,10,12,90),("face-pull",3,12,15,60),("barbell-curl",3,8,12,60),("hammer-curl",3,10,12,60)],
   2:[("back-squat",4,6,8,180),("romanian-deadlift",3,8,10,120),("leg-press",3,10,12,90),("leg-curl",3,10,12,60),("walking-lunge",3,10,12,90),("standing-calf-raise",4,12,15,60)],
  }),
 ("full-body","Full Body","One session that trains every major muscle group. Ideal for beginners training 3 days a week with a rest day between sessions.",
  ["Full Body"], {
   0:[("goblet-squat",3,8,12,90),("dumbbell-bench-press",3,8,12,90),("lat-pulldown",3,8,12,90),("romanian-deadlift",3,8,12,90),("dumbbell-shoulder-press",3,8,12,90),("seated-cable-row",3,10,12,60),("plank",3,30,60,60)],
  }),
 ("upper-lower","Upper / Lower","A 2-day split alternating upper-body and lower-body sessions. Run it 4 days a week (Upper, Lower, rest, Upper, Lower).",
  ["Upper","Lower"], {
   0:[("barbell-bench-press",4,6,8,150),("barbell-row",4,6,8,120),("overhead-press",3,8,10,120),("lat-pulldown",3,10,12,90),("dumbbell-curl",3,10,12,60),("triceps-pushdown",3,10,12,60)],
   1:[("back-squat",4,6,8,180),("romanian-deadlift",3,8,10,120),("leg-press",3,10,12,90),("leg-extension",3,12,15,60),("leg-curl",3,10,12,60),("seated-calf-raise",4,12,15,60)],
  }),
]

out = []
out.append("""-- GymBuddy: reference data — 40 built-in exercises and 3 starter routines.
-- Generated with fixed UUIDv5 ids (namespace 6f1c9a52-3d7e-4b8a-9c21-0e5d4f7a1b33)
-- so the app can rely on stable ids. Idempotent: re-running changes nothing.
-- Lives in a migration (not seed.sql) because production needs this data too.
""")
out.append("insert into public.exercises\n  (id, user_id, slug, name, primary_muscle, secondary_muscles, equipment, category, tracking, instructions)\nvalues")
rows = [f"  ({q(uid('exercise',s))}, null, {q(s)}, {q(n)}, {q(p)}, {arr(sec)}, {q(eq)}, {q(cat)}, {q(tr)}, {q(ins)})"
        for s,n,p,sec,eq,cat,tr,ins in E]
out.append(",\n".join(rows) + "\non conflict (id) do nothing;\n")

out.append("insert into public.routines (id, user_id, name, description, days)\nvalues")
rows = [f"  ({q(uid('routine',k))}, null, {q(n)}, {q(d)}, {arr(days)})" for k,n,d,days,_ in R]
out.append(",\n".join(rows) + "\non conflict (id) do nothing;\n")

out.append("insert into public.routine_exercises\n  (id, routine_id, user_id, exercise_id, day_index, position, target_sets, target_reps_min, target_reps_max, rest_seconds)\nvalues")
rows = []
n_items = 0
for k,_,_,_,plan in R:
    for day, items in plan.items():
        for pos,(s,sets,rmin,rmax,rest) in enumerate(items):
            assert s in slugs, s
            rows.append(f"  ({q(uid('routine_exercise',f'{k}/{day}/{pos}'))}, {q(uid('routine',k))}, null, {q(uid('exercise',s))}, {day}, {pos}, {sets}, {rmin}, {rmax}, {rest})")
            n_items += 1
out.append(",\n".join(rows) + "\non conflict (id) do nothing;\n")
sys.stdout.write("\n".join(out))
print(f"-- {len(E)} exercises, {len(R)} routines, {n_items} routine exercises", file=sys.stderr)
