-- Clean up existing data to start fresh with dummy data
DELETE FROM exercise_logs;
DELETE FROM workout_logs;
DELETE FROM routine_exercises;
DELETE FROM daily_routines;
DELETE FROM weekly_plans;

-- 1. Create a Weekly Plan
INSERT INTO weekly_plans (id, user_id, week_start_date, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days', true);

-- 2. Create Daily Routines (Mon-Sun)
INSERT INTO daily_routines (id, plan_id, day_of_week, target_focus) VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, 'Chest, Triceps'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'Back, Biceps'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 3, 'Rest'),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 4, 'Legs, Core'),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 5, 'Shoulders, Arms'),
('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 6, 'Full Body'),
('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111111', 7, 'Rest');

-- 3. Add some routine exercises for Monday (Chest, Triceps)
INSERT INTO routine_exercises (id, routine_id, exercise_name, target_sets, target_reps, coach_notes, is_warmup) VALUES
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Push Up', 2, 15, 'Warm up the chest', true),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222221', 'Bench Press', 4, 10, 'Focus on slow negative', false),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222221', 'Incline Dumbbell Press', 3, 12, 'Squeeze at the top', false),
('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222221', 'Triceps extension', 3, 15, 'Keep elbows tucked', false);

-- Add some for Tuesday (Back, Biceps)
INSERT INTO routine_exercises (id, routine_id, exercise_name, target_sets, target_reps, coach_notes, is_warmup) VALUES
('33333333-3333-3333-3333-333333333335', '22222222-2222-2222-2222-222222222222', 'Pull Up', 3, 8, 'Full range of motion', false),
('33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222222', 'Barbell Row', 4, 10, 'Keep back straight', false),
('33333333-3333-3333-3333-333333333337', '22222222-2222-2222-2222-222222222222', 'Biceps curl', 3, 12, 'No swinging', false);

-- 4. Create some Workout Logs for the past few days to populate the graph
-- 3 Days Ago
INSERT INTO workout_logs (id, user_id, routine_id, completed_at, notes) VALUES 
('44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222221', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Felt strong today');

-- 2 Days Ago
INSERT INTO workout_logs (id, user_id, routine_id, completed_at, notes) VALUES 
('44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Back is sore');

-- 1 Day Ago (Maybe they did Thursday''s workout early)
INSERT INTO workout_logs (id, user_id, routine_id, completed_at, notes) VALUES 
('44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222224', CURRENT_TIMESTAMP - INTERVAL '1 days', 'Leg day destroyed me');

-- 5. Create Exercise Logs (Sets) to give height to the graphs (total_sets)
-- 3 Days Ago Sets (12 sets total)
INSERT INTO exercise_logs (workout_log_id, exercise_id, set_number, reps_completed, weight_used)
SELECT '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333332', generate_series(1, 12), 10, 60;

-- 2 Days Ago Sets (8 sets total)
INSERT INTO exercise_logs (workout_log_id, exercise_id, set_number, reps_completed, weight_used)
SELECT '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333335', generate_series(1, 8), 8, 0;

-- 1 Day Ago Sets (15 sets total)
INSERT INTO exercise_logs (workout_log_id, exercise_id, set_number, reps_completed, weight_used)
SELECT '44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333335', generate_series(1, 15), 10, 100;
