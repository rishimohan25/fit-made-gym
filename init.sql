CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (You)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT,
  user_pin TEXT DEFAULT '5555',
  trainer_pin TEXT,
  trainer_name TEXT,
  trainer_pin_expires_at TIMESTAMP,
  custom_muscles TEXT[] DEFAULT '{}'
);

-- Weekly Plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  week_start_date DATE,
  trainer_access_token TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true
);

-- Daily Routines
CREATE TABLE IF NOT EXISTS daily_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_of_week INT, -- (1-7)
  target_focus TEXT -- e.g., 'Leg Day'
);

-- Routine Exercises (Planned by Trainer)
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
  exercise_name TEXT,
  target_sets INT,
  target_reps INT,
  rest_seconds INT,
  coach_notes TEXT,
  is_warmup BOOLEAN DEFAULT FALSE
);

-- Workout Logs (Actual execution by User)
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Exercise Logs (Sets completed)
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES routine_exercises(id) ON DELETE CASCADE,
  set_number INT,
  reps_completed INT,
  weight_used DECIMAL
);

-- Exercise Rich Details (Fetched from Exa)
CREATE TABLE IF NOT EXISTS exercise_details (
  id SERIAL PRIMARY KEY,
  exercise_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  youtube_url VARCHAR(255),
  target_muscle VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed an initial user
INSERT INTO users (id, name, email) VALUES ('00000000-0000-0000-0000-000000000001', 'Rishi', 'rishi@example.com') ON CONFLICT DO NOTHING;
