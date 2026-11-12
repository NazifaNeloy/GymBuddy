-- GymBuddy: reference data — 40 built-in exercises and 3 starter routines.
-- Generated with fixed UUIDv5 ids (namespace 6f1c9a52-3d7e-4b8a-9c21-0e5d4f7a1b33)
-- so the app can rely on stable ids. Idempotent: re-running changes nothing.
-- Lives in a migration (not seed.sql) because production needs this data too.

insert into public.exercises
  (id, user_id, slug, name, primary_muscle, secondary_muscles, equipment, category, tracking, instructions)
values
  ('0750d601-883f-5f74-a040-1c507e06810e', null, 'barbell-bench-press', 'Barbell Bench Press', 'chest', array['triceps', 'shoulders']::text[], 'barbell', 'compound', 'weight_reps', 'Lie on the bench with eyes under the bar. Grip slightly wider than shoulders, lower the bar to mid-chest with elbows about 45 degrees from your body, then press back up.'),
  ('9d008949-be97-5821-9f36-ce3c3d92584d', null, 'incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', array['shoulders', 'triceps']::text[], 'dumbbell', 'compound', 'weight_reps', 'Set the bench to 30-45 degrees. Start with dumbbells over the upper chest, lower them to the sides of the chest, then press up and slightly together.'),
  ('4eb4323b-d85e-54fc-8e49-2b4dbb2bb235', null, 'dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', array['triceps', 'shoulders']::text[], 'dumbbell', 'compound', 'weight_reps', 'Lie flat holding dumbbells above the chest. Lower under control until the elbows are just below the bench, then press back up.'),
  ('3af92c9f-091d-50c3-bdd6-e9968530f2be', null, 'push-up', 'Push-Up', 'chest', array['triceps', 'shoulders', 'core']::text[], 'bodyweight', 'compound', 'bodyweight_reps', 'Hands under the shoulders, body in a straight line from head to heels. Lower your chest to just above the floor and push back up.'),
  ('d83322c6-6b38-56e1-98d3-65603e99d7fd', null, 'cable-fly', 'Cable Fly', 'chest', array['shoulders']::text[], 'cable', 'isolation', 'weight_reps', 'Stand between two high pulleys with a slight bend in the elbows. Bring the handles together in front of the chest in a wide arc, then return slowly.'),
  ('e8ecab25-553b-524d-8ab3-1bf32543a8dc', null, 'deadlift', 'Deadlift', 'back', array['hamstrings', 'glutes', 'forearms']::text[], 'barbell', 'compound', 'weight_reps', 'Bar over mid-foot, hips back, back flat. Push the floor away to stand tall with the bar close to your legs, then hinge back down with control.'),
  ('154ee1a1-0c7f-55f5-8856-e4bc5fa3ff6c', null, 'pull-up', 'Pull-Up', 'back', array['biceps', 'forearms']::text[], 'bodyweight', 'compound', 'bodyweight_reps', 'Hang from the bar with an overhand grip. Pull your chest toward the bar by driving the elbows down, then lower to a full hang.'),
  ('583206e7-c9d5-52f3-a2eb-2df13ca054e0', null, 'lat-pulldown', 'Lat Pulldown', 'back', array['biceps']::text[], 'cable', 'compound', 'weight_reps', 'Sit with thighs under the pads. Pull the bar to the upper chest while keeping the torso tall, then let it rise until the arms are straight.'),
  ('723764bb-7eef-5eb5-a3eb-7dd532121c9a', null, 'barbell-row', 'Barbell Row', 'back', array['biceps', 'shoulders']::text[], 'barbell', 'compound', 'weight_reps', 'Hinge forward with a flat back. Row the bar to the lower ribs, squeezing the shoulder blades together, then lower it under control.'),
  ('64e25794-d1e4-5a21-8d3a-2b1c907826ea', null, 'seated-cable-row', 'Seated Cable Row', 'back', array['biceps']::text[], 'cable', 'compound', 'weight_reps', 'Sit tall with knees slightly bent. Pull the handle to your stomach, pause with shoulder blades squeezed, and return without rounding forward.'),
  ('ac4bcd2d-5941-57b7-97fe-f5f7a9429d34', null, 'one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'back', array['biceps']::text[], 'dumbbell', 'compound', 'weight_reps', 'Support one hand and knee on a bench. Row the dumbbell toward the hip, keeping the torso still, then lower until the arm is straight.'),
  ('ab9ae7d5-9af7-5813-ad8f-f40388845f29', null, 'overhead-press', 'Overhead Press', 'shoulders', array['triceps', 'core']::text[], 'barbell', 'compound', 'weight_reps', 'Stand with the bar on the front of the shoulders. Brace and press it straight overhead, moving your head back slightly to clear the bar, then lower.'),
  ('6445fdbb-ff71-5a08-af66-8d82d6496cf1', null, 'dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', array['triceps']::text[], 'dumbbell', 'compound', 'weight_reps', 'Seated or standing, start with dumbbells at shoulder height. Press overhead until the arms are straight, then lower slowly.'),
  ('14ecc3df-0bff-57f5-82ec-92f4accbde74', null, 'lateral-raise', 'Lateral Raise', 'shoulders', '{}'::text[], 'dumbbell', 'isolation', 'weight_reps', 'With a slight elbow bend, raise the dumbbells out to the sides until roughly shoulder height. Lower slowly without swinging.'),
  ('5e2c95e5-50fe-5b58-a919-36fc814b1655', null, 'face-pull', 'Face Pull', 'shoulders', array['back']::text[], 'cable', 'isolation', 'weight_reps', 'Use a rope at face height. Pull toward your eyes with elbows high, separating the rope ends, then return under control.'),
  ('19bfea4f-6557-53ca-8a6f-168a2fe68cbc', null, 'rear-delt-fly', 'Rear Delt Fly', 'shoulders', array['back']::text[], 'dumbbell', 'isolation', 'weight_reps', 'Hinge forward with a flat back. Raise the dumbbells out to the sides leading with the elbows, then lower slowly.'),
  ('32ce4a09-f476-56ad-b3cb-6378bde31cd5', null, 'barbell-curl', 'Barbell Curl', 'biceps', array['forearms']::text[], 'barbell', 'isolation', 'weight_reps', 'Stand with elbows at your sides. Curl the bar toward the shoulders without swinging, then lower until the arms are straight.'),
  ('45fd61b6-fa7b-58b9-a966-f99876f47045', null, 'dumbbell-curl', 'Dumbbell Curl', 'biceps', array['forearms']::text[], 'dumbbell', 'isolation', 'weight_reps', 'Palms facing forward, curl the dumbbells up while keeping the upper arms still, then lower with control.'),
  ('e0d361fb-4ef7-5c57-822c-31ecd578cae6', null, 'hammer-curl', 'Hammer Curl', 'biceps', array['forearms']::text[], 'dumbbell', 'isolation', 'weight_reps', 'Hold dumbbells with palms facing each other. Curl up keeping that neutral grip, then lower slowly.'),
  ('6742a3b4-14f1-5af3-a35a-a3439f1d8d06', null, 'triceps-pushdown', 'Triceps Pushdown', 'triceps', '{}'::text[], 'cable', 'isolation', 'weight_reps', 'Elbows pinned at your sides, push the bar or rope down until the arms are straight, then let it rise to about chest height.'),
  ('db79a594-237f-5ae0-b3b4-9dd45e9bb7db', null, 'overhead-triceps-extension', 'Overhead Triceps Extension', 'triceps', '{}'::text[], 'dumbbell', 'isolation', 'weight_reps', 'Hold one dumbbell overhead with both hands. Lower it behind the head by bending the elbows, then extend back up.'),
  ('6f5e15ce-63e7-5f56-b24e-5c1d65657719', null, 'close-grip-bench-press', 'Close-Grip Bench Press', 'triceps', array['chest', 'shoulders']::text[], 'barbell', 'compound', 'weight_reps', 'Bench press with hands about shoulder-width apart and elbows tucked closer to the body.'),
  ('d4b9ad51-f33e-5bab-b107-8de227c40cc0', null, 'triceps-dip', 'Triceps Dip', 'triceps', array['chest', 'shoulders']::text[], 'bodyweight', 'compound', 'bodyweight_reps', 'On parallel bars, keep the torso upright and lower until the elbows reach about 90 degrees, then press back up.'),
  ('f89462a6-df53-53aa-8773-1ad72ec24bf0', null, 'back-squat', 'Back Squat', 'quads', array['glutes', 'hamstrings', 'core']::text[], 'barbell', 'compound', 'weight_reps', 'Bar across the upper back, feet shoulder-width. Sit down and back until the thighs are at least parallel, keeping the chest up, then stand.'),
  ('80e3454f-3617-5c4a-9890-10582eef3cea', null, 'front-squat', 'Front Squat', 'quads', array['glutes', 'core']::text[], 'barbell', 'compound', 'weight_reps', 'Rest the bar on the front of the shoulders with elbows high. Squat down with an upright torso, then drive back up.'),
  ('4f941e1d-0795-56e0-bc8f-dc851a0de47a', null, 'goblet-squat', 'Goblet Squat', 'quads', array['glutes', 'core']::text[], 'dumbbell', 'compound', 'weight_reps', 'Hold a dumbbell or kettlebell at the chest. Squat between your knees with the chest up, then stand. A good first squat to learn.'),
  ('993f1273-3b24-552d-b690-faae0426b213', null, 'leg-press', 'Leg Press', 'quads', array['glutes', 'hamstrings']::text[], 'machine', 'compound', 'weight_reps', 'Feet shoulder-width on the platform. Lower until the knees reach about 90 degrees without the lower back lifting, then press out.'),
  ('0175c821-fe98-590e-b4ef-10364ed2fd7a', null, 'leg-extension', 'Leg Extension', 'quads', '{}'::text[], 'machine', 'isolation', 'weight_reps', 'Pad on the lower shins. Straighten the legs fully, pause briefly, then lower slowly.'),
  ('4ea4d441-7c85-54c4-ba99-eaad546410cc', null, 'walking-lunge', 'Walking Lunge', 'quads', array['glutes', 'hamstrings']::text[], 'dumbbell', 'compound', 'weight_reps', 'Step forward and lower until both knees are about 90 degrees, then step through into the next lunge. Count reps per leg.'),
  ('d9baec8c-4010-5a47-85d7-77010b84d4e9', null, 'bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', array['glutes']::text[], 'dumbbell', 'compound', 'weight_reps', 'Rear foot on a bench behind you. Lower the back knee toward the floor, keeping the front heel down, then stand. Count reps per leg.'),
  ('e023847e-51b2-5014-b183-739eb2562988', null, 'romanian-deadlift', 'Romanian Deadlift', 'hamstrings', array['glutes', 'back']::text[], 'barbell', 'compound', 'weight_reps', 'With soft knees, push the hips back and slide the bar down the thighs until you feel a hamstring stretch, then drive the hips forward.'),
  ('6d6f1216-b79c-5917-b846-765fe2c1b109', null, 'leg-curl', 'Leg Curl', 'hamstrings', '{}'::text[], 'machine', 'isolation', 'weight_reps', 'Pad just above the heels. Curl the heels toward your glutes, pause, then lower under control.'),
  ('732b4321-51ef-5ce0-8c3d-861b5df8a197', null, 'hip-thrust', 'Hip Thrust', 'glutes', array['hamstrings']::text[], 'barbell', 'compound', 'weight_reps', 'Upper back on a bench, bar across the hips. Drive through the heels to lift the hips until the body is flat, squeeze, then lower.'),
  ('6340f552-6a63-5d8a-9d3c-d039bc293abe', null, 'glute-bridge', 'Glute Bridge', 'glutes', array['hamstrings']::text[], 'bodyweight', 'isolation', 'bodyweight_reps', 'Lie on your back with knees bent. Lift the hips by squeezing the glutes until knees, hips and shoulders line up, then lower.'),
  ('26078ef9-c9b7-5117-99a0-bc5f3bdfbce6', null, 'standing-calf-raise', 'Standing Calf Raise', 'calves', '{}'::text[], 'machine', 'isolation', 'weight_reps', 'Balls of the feet on the edge of a step. Rise as high as possible, pause, then lower the heels below the step.'),
  ('d71dfa5f-6cbf-53c5-b90b-9730f391dd56', null, 'seated-calf-raise', 'Seated Calf Raise', 'calves', '{}'::text[], 'machine', 'isolation', 'weight_reps', 'Seated with the pad on the knees. Raise the heels as high as possible, then lower for a full stretch.'),
  ('7026fd15-1de5-553f-915b-991ac275d01e', null, 'plank', 'Plank', 'core', array['shoulders']::text[], 'bodyweight', 'isolation', 'duration', 'Forearms under the shoulders, body straight from head to heels. Brace the stomach and hold. Logged in seconds.'),
  ('9729dd51-21aa-5461-8e94-7db908d63d42', null, 'hanging-leg-raise', 'Hanging Leg Raise', 'core', array['forearms']::text[], 'bodyweight', 'isolation', 'bodyweight_reps', 'Hang from a bar. Raise the legs by curling the pelvis up, avoid swinging, then lower slowly. Bend the knees to make it easier.'),
  ('6267deb8-f4ab-5c4c-bc6c-6da88b4594e0', null, 'cable-crunch', 'Cable Crunch', 'core', '{}'::text[], 'cable', 'isolation', 'weight_reps', 'Kneel facing a high pulley holding a rope by your head. Curl the ribs toward the hips, then return slowly.'),
  ('abb3a82f-70da-569a-b693-4069398c7e0f', null, 'dead-bug', 'Dead Bug', 'core', '{}'::text[], 'bodyweight', 'isolation', 'bodyweight_reps', 'Lie on your back with arms up and knees at 90 degrees. Lower the opposite arm and leg while keeping the lower back flat, then switch.')
on conflict (id) do nothing;

insert into public.routines (id, user_id, name, description, days)
values
  ('b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'Push / Pull / Legs', 'A 3-day split: chest, shoulders and triceps; back and biceps; then legs. Run it 3 or 6 days a week.', array['Push', 'Pull', 'Legs']::text[]),
  ('6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, 'Full Body', 'One session that trains every major muscle group. Ideal for beginners training 3 days a week with a rest day between sessions.', array['Full Body']::text[]),
  ('2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, 'Upper / Lower', 'A 2-day split alternating upper-body and lower-body sessions. Run it 4 days a week (Upper, Lower, rest, Upper, Lower).', array['Upper', 'Lower']::text[])
on conflict (id) do nothing;

insert into public.routine_exercises
  (id, routine_id, user_id, exercise_id, day_index, position, target_sets, target_reps_min, target_reps_max, rest_seconds)
values
  ('dace3e4b-8320-5beb-a029-55e47b17ba71', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '0750d601-883f-5f74-a040-1c507e06810e', 0, 0, 4, 6, 8, 150),
  ('3923352a-8d0d-5468-bb13-ed00ed956646', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'ab9ae7d5-9af7-5813-ad8f-f40388845f29', 0, 1, 3, 8, 10, 120),
  ('ce3e0987-1419-5f92-b354-ee231bc93f9c', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '9d008949-be97-5821-9f36-ce3c3d92584d', 0, 2, 3, 8, 12, 90),
  ('1f51a750-19cb-5715-943a-61b446aaeb43', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '14ecc3df-0bff-57f5-82ec-92f4accbde74', 0, 3, 3, 12, 15, 60),
  ('266f5331-e8a5-5336-b33f-87f6de59628f', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '6742a3b4-14f1-5af3-a35a-a3439f1d8d06', 0, 4, 3, 10, 12, 60),
  ('27f84253-495d-521b-8dbd-874fc0d81bc7', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'db79a594-237f-5ae0-b3b4-9dd45e9bb7db', 0, 5, 3, 10, 12, 60),
  ('173cfd26-1371-58f7-adad-189e71633c36', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'e8ecab25-553b-524d-8ab3-1bf32543a8dc', 1, 0, 3, 5, 5, 180),
  ('222d3ed0-1e2b-5f26-9089-eb1fb720aed1', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '154ee1a1-0c7f-55f5-8856-e4bc5fa3ff6c', 1, 1, 3, 6, 10, 120),
  ('6d0d8af2-de2c-52eb-9fb3-b146d4593163', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '723764bb-7eef-5eb5-a3eb-7dd532121c9a', 1, 2, 3, 8, 10, 120),
  ('b0e23525-f4fe-57b1-8fce-7c845fb3351c', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '64e25794-d1e4-5a21-8d3a-2b1c907826ea', 1, 3, 3, 10, 12, 90),
  ('718a4912-e559-56ef-81b5-0a86e187e54e', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '5e2c95e5-50fe-5b58-a919-36fc814b1655', 1, 4, 3, 12, 15, 60),
  ('07a49e0f-ed72-5a93-8a51-919f18467010', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '32ce4a09-f476-56ad-b3cb-6378bde31cd5', 1, 5, 3, 8, 12, 60),
  ('9c193a59-7f62-5b82-8681-41e38e5b2913', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'e0d361fb-4ef7-5c57-822c-31ecd578cae6', 1, 6, 3, 10, 12, 60),
  ('54197744-e40a-57c2-8207-0f3e8c09a1c3', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'f89462a6-df53-53aa-8773-1ad72ec24bf0', 2, 0, 4, 6, 8, 180),
  ('965697cb-d720-505e-bf9c-193dbbfe79ed', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, 'e023847e-51b2-5014-b183-739eb2562988', 2, 1, 3, 8, 10, 120),
  ('8a570687-0cba-5238-afdb-a91687a2e6c0', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '993f1273-3b24-552d-b690-faae0426b213', 2, 2, 3, 10, 12, 90),
  ('8477d831-cdaf-5072-ae83-73945af291fa', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '6d6f1216-b79c-5917-b846-765fe2c1b109', 2, 3, 3, 10, 12, 60),
  ('c0dbb12e-5ba7-5e89-a74d-d9afd89b4599', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '4ea4d441-7c85-54c4-ba99-eaad546410cc', 2, 4, 3, 10, 12, 90),
  ('42d31257-afe5-59bf-a0ab-367b50eb7986', 'b9c29dbb-fc78-515f-943e-731c674b5aca', null, '26078ef9-c9b7-5117-99a0-bc5f3bdfbce6', 2, 5, 4, 12, 15, 60),
  ('6fa49556-e262-5ad4-89d4-ec81fe5477ec', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '4f941e1d-0795-56e0-bc8f-dc851a0de47a', 0, 0, 3, 8, 12, 90),
  ('a225abd9-7512-5582-9a19-77e0cce83098', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '4eb4323b-d85e-54fc-8e49-2b4dbb2bb235', 0, 1, 3, 8, 12, 90),
  ('2a67175d-cf6a-5685-af4d-ac57c1bfdfa1', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '583206e7-c9d5-52f3-a2eb-2df13ca054e0', 0, 2, 3, 8, 12, 90),
  ('94e2e7fd-c884-590d-b20f-93e20100bc21', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, 'e023847e-51b2-5014-b183-739eb2562988', 0, 3, 3, 8, 12, 90),
  ('7aaa09a9-8bf5-5bcc-8c83-ef0be357baa3', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '6445fdbb-ff71-5a08-af66-8d82d6496cf1', 0, 4, 3, 8, 12, 90),
  ('40ac98af-615a-5d57-8e95-18142a598814', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '64e25794-d1e4-5a21-8d3a-2b1c907826ea', 0, 5, 3, 10, 12, 60),
  ('0f6f38ad-ca2d-5758-9c55-5699062395f0', '6545a8cb-bd8d-56c2-a2ef-0d8aaf3ce66b', null, '7026fd15-1de5-553f-915b-991ac275d01e', 0, 6, 3, 30, 60, 60),
  ('273fb99b-28a8-5fcf-996c-73efd1ae90ec', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '0750d601-883f-5f74-a040-1c507e06810e', 0, 0, 4, 6, 8, 150),
  ('8c76dcf1-7bc3-5354-a752-adfdc3844f5b', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '723764bb-7eef-5eb5-a3eb-7dd532121c9a', 0, 1, 4, 6, 8, 120),
  ('09da6598-0a84-5785-ae35-cad70da95b98', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, 'ab9ae7d5-9af7-5813-ad8f-f40388845f29', 0, 2, 3, 8, 10, 120),
  ('f5c22cfb-2374-5e5a-a7e2-0d6490d566ef', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '583206e7-c9d5-52f3-a2eb-2df13ca054e0', 0, 3, 3, 10, 12, 90),
  ('a13c2675-b3ec-5a71-ab9c-ccb6a23d0fdf', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '45fd61b6-fa7b-58b9-a966-f99876f47045', 0, 4, 3, 10, 12, 60),
  ('262a4b9b-59c5-580d-b51f-42361d681fe7', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '6742a3b4-14f1-5af3-a35a-a3439f1d8d06', 0, 5, 3, 10, 12, 60),
  ('608e075c-b048-531d-82c5-c342cbbbe31a', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, 'f89462a6-df53-53aa-8773-1ad72ec24bf0', 1, 0, 4, 6, 8, 180),
  ('43974dc4-7a8a-5946-b146-f4a655ff0365', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, 'e023847e-51b2-5014-b183-739eb2562988', 1, 1, 3, 8, 10, 120),
  ('894a3f0d-2213-5053-8f4e-6838726cc5fd', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '993f1273-3b24-552d-b690-faae0426b213', 1, 2, 3, 10, 12, 90),
  ('3232ddcc-b7f0-5213-a3c9-19c5232a0355', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '0175c821-fe98-590e-b4ef-10364ed2fd7a', 1, 3, 3, 12, 15, 60),
  ('e7d0ac85-92c4-57c9-a484-7c4cac4fb2b6', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, '6d6f1216-b79c-5917-b846-765fe2c1b109', 1, 4, 3, 10, 12, 60),
  ('01e87348-d062-502f-8d6f-a66610e79cc4', '2b6bb2dd-f2d3-58f2-964e-195d9674e8ce', null, 'd71dfa5f-6cbf-53c5-b90b-9730f391dd56', 1, 5, 4, 12, 15, 60)
on conflict (id) do nothing;
