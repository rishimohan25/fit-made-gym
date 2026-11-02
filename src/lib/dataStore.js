import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import { STANDARD_EXERCISES } from './exercises.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'gym_schedule.json');
const LAST_WEEK_FILE = path.join(DATA_DIR, 'last_week_schedule.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'admin_credentials.json');
const CUSTOM_EXERCISES_FILE = path.join(DATA_DIR, 'custom_exercises.json');

// Serverless / Vercel write fallbacks
const TMP_SCHEDULE_FILE = '/tmp/gym_schedule.json';
const TMP_LAST_WEEK_FILE = '/tmp/last_week_schedule.json';
const TMP_CREDENTIALS_FILE = '/tmp/admin_credentials.json';
const TMP_CUSTOM_EXERCISES_FILE = '/tmp/custom_exercises.json';

// In-memory cache for ultra-fast serverless reads & updates
let memorySchedules = null;
let memoryLastWeekSchedules = null;
let memoryCredentials = null;
let memoryCustomExercises = null;

function safeWriteJson(primaryPath, tmpPath, data) {
  const content = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(primaryPath, content, 'utf8');
  } catch (err) {
    try {
      fs.writeFileSync(tmpPath, content, 'utf8');
    } catch (e) {
      // Memory fallback active
    }
  }
}

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

// PostgreSQL pool initialization if env exists
let pgPool = null;
if (process.env.DATABASE_URL || process.env.POSTGRES_HOST) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      user: process.env.POSTGRES_USER || 'workout_user',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: process.env.POSTGRES_DB || 'workout_tracker',
      password: process.env.POSTGRES_PASSWORD || 'workout_password',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false,
    });
  } catch (err) {
    console.warn('PostgreSQL pool init warning:', err.message);
  }
}

// Default 7-day workout schedule with Warmups, Workouts, Cardio, and Stretches
export const DEFAULT_SCHEDULE = [
  {
    day_of_week: 1,
    day_name: 'Monday',
    target_focus: 'Chest & Triceps Hypertrophy',
    warmups: [
      {
        id: 'w-1',
        name: 'Resistance Band Pull-Aparts & Arm Circles',
        target_reps: '2 sets × 20 reps',
        duration_seconds: 180,
        coach_notes: 'Prime shoulder joints, warm rotator cuffs before benching.',
        muscles: ['front-deltoids', 'back-deltoids', 'trapezius'],
      },
      {
        id: 'w-2',
        name: 'Incline Bench Warm-Up Pushups',
        target_reps: '2 sets × 15 reps',
        duration_seconds: 120,
        coach_notes: 'Focus on full pectoral stretch at the bottom.',
        muscles: ['chest', 'triceps'],
      },
    ],
    workouts: [
      {
        id: 'ex-101',
        exercise_name: 'Barbell Bench Press',
        target_sets: 4,
        target_reps: '8-10 reps',
        rest_seconds: 90,
        coach_notes: 'Retract scapulae, lower bar to mid-chest with 2-second eccentric tempo.',
        primary_muscles: ['chest'],
        secondary_muscles: ['triceps', 'front-deltoids'],
        imageUrl: '/images/exercises/barbell-bench-press.png',
      },
      {
        id: 'ex-102',
        exercise_name: 'Incline Dumbbell Press',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 75,
        coach_notes: 'Bench at 30 degrees. Squeeze upper chest at top peak.',
        primary_muscles: ['chest', 'front-deltoids'],
        secondary_muscles: ['triceps'],
        imageUrl: '/images/exercises/incline-dumbbell-press.png',
      },
      {
        id: 'ex-103',
        exercise_name: 'Cable Chest Flyes',
        target_sets: 3,
        target_reps: '12-15 reps',
        rest_seconds: 60,
        coach_notes: 'Hug an imaginary tree, hold peak squeeze for 1 second.',
        primary_muscles: ['chest'],
        secondary_muscles: ['front-deltoids'],
        imageUrl: '/images/exercises/cable-chest-flyes.png',
      },
      {
        id: 'ex-104',
        exercise_name: 'Triceps Cable Rope Pushdown',
        target_sets: 4,
        target_reps: '12-15 reps',
        rest_seconds: 60,
        coach_notes: 'Pin elbows to ribs, spread rope handles apart at bottom.',
        primary_muscles: ['triceps'],
        secondary_muscles: ['forearm'],
        imageUrl: '/images/exercises/tricep-pushdown.png',
      },
    ],
    cardio: [
      {
        id: 'c-1',
        name: '12-3-30 Incline Treadmill Walk',
        duration_minutes: 20,
        target_intensity: 'Zone 2 (120-135 BPM)',
        equipment: 'Treadmill',
        coach_notes: '12% incline, 3.0 mph speed. Hands off rails to burn fat without fatigue.',
      },
    ],
    stretches: [
      {
        id: 's-1',
        name: 'Doorway Pectoral Stretch',
        target_duration: '2 sets × 30s each side',
        coach_notes: 'Forearm on door jamb, step forward gently to open chest cavity.',
        muscles: ['chest', 'front-deltoids'],
      },
      {
        id: 's-2',
        name: 'Overhead Triceps & Lat Stretch',
        target_duration: '2 sets × 30s each arm',
        coach_notes: 'Ease elbow behind neck with opposite hand.',
        muscles: ['triceps', 'upper-back'],
      },
    ],
  },
  {
    day_of_week: 2,
    day_name: 'Tuesday',
    target_focus: 'Back & Biceps Thickness',
    warmups: [
      {
        id: 'w-3',
        name: 'Cat-Cow Spinal Mobility & Band Rows',
        target_reps: '2 sets × 12 reps',
        duration_seconds: 180,
        coach_notes: 'Decompress spine, activate scapular retractors.',
        muscles: ['upper-back', 'lower-back'],
      },
      {
        id: 'w-4',
        name: 'Dead Hang Lat Stretch',
        target_reps: '2 sets × 30 seconds',
        duration_seconds: 120,
        coach_notes: 'Hang freely from pull-up bar, deep diaphragmatic breaths.',
        muscles: ['upper-back', 'biceps'],
      },
    ],
    workouts: [
      {
        id: 'ex-201',
        exercise_name: 'Lat Pulldown',
        target_sets: 4,
        target_reps: '10-12 reps',
        rest_seconds: 75,
        coach_notes: 'Drive elbows down into ribs, full stretch at top, squeeze latissimus dorsi at bottom.',
        primary_muscles: ['upper-back'],
        secondary_muscles: ['biceps', 'trapezius', 'forearm'],
        imageUrl: '/images/exercises/lat-pulldown.png',
      },
      {
        id: 'ex-202',
        exercise_name: 'Barbell Bent-Over Row',
        target_sets: 4,
        target_reps: '8-10 reps',
        rest_seconds: 90,
        coach_notes: 'Hinge hips back at 45 degrees, pull barbell to lower navel.',
        primary_muscles: ['upper-back', 'trapezius'],
        secondary_muscles: ['lower-back', 'biceps'],
        imageUrl: '',
      },
      {
        id: 'ex-203',
        exercise_name: 'Seated Cable Row',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 60,
        coach_notes: 'Chest out proud, pull close to abdominal wall, hold 1s.',
        primary_muscles: ['upper-back'],
        secondary_muscles: ['biceps', 'trapezius'],
        imageUrl: '',
      },
      {
        id: 'ex-204',
        exercise_name: 'Barbell Bicep Curl',
        target_sets: 4,
        target_reps: '10-12 reps',
        rest_seconds: 60,
        coach_notes: 'No hip sway. Control the lowering phase strictly.',
        primary_muscles: ['biceps'],
        secondary_muscles: ['forearm'],
        imageUrl: '',
      },
    ],
    cardio: [
      {
        id: 'c-2',
        name: 'Concept2 Rowing Intervals',
        duration_minutes: 15,
        target_intensity: 'Moderate Aerobic (2:05/500m split)',
        equipment: 'Rowing Machine',
        coach_notes: 'Smooth stroke rate (22-24 s/m), drive with legs then finish with back.',
      },
    ],
    stretches: [
      {
        id: 's-3',
        name: 'Hanging Lat Stretch & Thoracic Opener',
        target_duration: '2 sets × 45 seconds',
        coach_notes: 'Sink hips back while holding a vertical bar to stretch side lats.',
        muscles: ['upper-back'],
      },
      {
        id: 's-4',
        name: 'Cross-Body Posterior Deltoid Stretch',
        target_duration: '2 sets × 30s each arm',
        coach_notes: 'Relieves rear shoulder and upper trap tension.',
        muscles: ['back-deltoids'],
      },
    ],
  },
  {
    day_of_week: 3,
    day_name: 'Wednesday',
    target_focus: 'Legs & Calves Power',
    warmups: [
      {
        id: 'w-5',
        name: 'Bodyweight Deep Squats & Hip Openers',
        target_reps: '2 sets × 15 reps',
        duration_seconds: 180,
        coach_notes: 'Pry open adductors and lubricate knee and hip joints.',
        muscles: ['quadriceps', 'gluteal', 'knees'],
      },
      {
        id: 'w-6',
        name: 'Jumping Jacks & Dynamic Skips',
        target_reps: '2 minutes continuous',
        duration_seconds: 120,
        coach_notes: 'Elevate heart rate and warm calf tendons.',
        muscles: ['calves', 'quadriceps'],
      },
    ],
    workouts: [
      {
        id: 'ex-301',
        exercise_name: 'Barbell Back Squat',
        target_sets: 4,
        target_reps: '6-8 reps',
        rest_seconds: 120,
        coach_notes: 'Break parallel, push through mid-foot, brace abdominal wall.',
        primary_muscles: ['quadriceps', 'gluteal'],
        secondary_muscles: ['hamstring', 'lower-back'],
        imageUrl: '/images/exercises/squat.png',
      },
      {
        id: 'ex-302',
        exercise_name: 'Romanian Deadlift (RDL)',
        target_sets: 3,
        target_reps: '8-10 reps',
        rest_seconds: 90,
        coach_notes: 'Hips push back, stop when hamstrings hit maximal stretch.',
        primary_muscles: ['hamstring', 'gluteal'],
        secondary_muscles: ['lower-back'],
        imageUrl: '',
      },
      {
        id: 'ex-303',
        exercise_name: '45-Degree Leg Press',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 90,
        coach_notes: 'Controlled descent. Do not let lower back round off pad.',
        primary_muscles: ['quadriceps', 'gluteal'],
        secondary_muscles: ['hamstring'],
        imageUrl: '',
      },
      {
        id: 'ex-304',
        exercise_name: 'Standing Calf Raise',
        target_sets: 4,
        target_reps: '15-20 reps',
        rest_seconds: 45,
        coach_notes: 'Full pause at bottom stretch, full flex on toes.',
        primary_muscles: ['calves'],
        secondary_muscles: ['left-soleus', 'right-soleus'],
        imageUrl: '',
      },
    ],
    cardio: [
      {
        id: 'c-3',
        name: 'StairMaster Steady Climb',
        duration_minutes: 15,
        target_intensity: 'Moderate Steady (Level 6)',
        equipment: 'StairMaster',
        coach_notes: 'Drive through whole foot, do not lean on handles.',
      },
    ],
    stretches: [
      {
        id: 's-5',
        name: 'Standing Quadriceps Stretch',
        target_duration: '2 sets × 30s each leg',
        coach_notes: 'Hold ankle, pull heel to glute, push hips forward.',
        muscles: ['quadriceps'],
      },
      {
        id: 's-6',
        name: 'Pigeon Pose Glute & Hip Stretch',
        target_duration: '2 sets × 45s each leg',
        coach_notes: 'Sink hips downward to release deep piriformis and glute tissue.',
        muscles: ['gluteal', 'hamstring'],
      },
    ],
  },
  {
    day_of_week: 4,
    day_name: 'Thursday',
    target_focus: 'Shoulders, Upper Traps & Core',
    warmups: [
      {
        id: 'w-7',
        name: 'Shoulder Dislocates & Band Y-Raises',
        target_reps: '2 sets × 15 reps',
        duration_seconds: 180,
        coach_notes: 'Warm scapular upward rotators and deltoids.',
        muscles: ['front-deltoids', 'trapezius'],
      },
    ],
    workouts: [
      {
        id: 'ex-401',
        exercise_name: 'Overhead Barbell Military Press',
        target_sets: 4,
        target_reps: '6-8 reps',
        rest_seconds: 90,
        coach_notes: 'Glutes squeezed, core braced, press directly overhead.',
        primary_muscles: ['front-deltoids'],
        secondary_muscles: ['triceps', 'trapezius'],
        imageUrl: '',
      },
      {
        id: 'ex-402',
        exercise_name: 'Dumbbell Lateral Raises',
        target_sets: 4,
        target_reps: '12-15 reps',
        rest_seconds: 60,
        coach_notes: 'Slight bend in elbows, lead with elbows up to parallel.',
        primary_muscles: ['front-deltoids'],
        secondary_muscles: ['trapezius'],
        imageUrl: '',
      },
      {
        id: 'ex-403',
        exercise_name: 'Cable Face Pulls',
        target_sets: 3,
        target_reps: '15 reps',
        rest_seconds: 60,
        coach_notes: 'Pull to eyes and externally rotate forearms.',
        primary_muscles: ['back-deltoids', 'trapezius'],
        secondary_muscles: ['upper-back'],
        imageUrl: '',
      },
      {
        id: 'ex-404',
        exercise_name: 'Hanging Leg Raises',
        target_sets: 3,
        target_reps: '12-15 reps',
        rest_seconds: 60,
        coach_notes: 'Roll pelvis upward, avoid swinging momentum.',
        primary_muscles: ['abs'],
        secondary_muscles: ['obliques'],
        imageUrl: '',
      },
    ],
    cardio: [
      {
        id: 'c-4',
        name: 'Assault AirBike Calorie Burn',
        duration_minutes: 12,
        target_intensity: 'Moderate High (60 RPM)',
        equipment: 'AirBike',
        coach_notes: 'Push and pull handles with upper body while pedaling.',
      },
    ],
    stretches: [
      {
        id: 's-7',
        name: 'Behind-the-Back Shoulder Extension Stretch',
        target_duration: '2 sets × 30s',
        coach_notes: 'Interlace fingers behind back, lift chest tall to stretch front delts.',
        muscles: ['front-deltoids', 'chest'],
      },
    ],
  },
  {
    day_of_week: 5,
    day_name: 'Friday',
    target_focus: 'Full Upper Body Pump',
    warmups: [
      {
        id: 'w-8',
        name: 'Dynamic Push-Up & Arm Swings',
        target_reps: '2 sets × 12 reps',
        duration_seconds: 120,
        coach_notes: 'Fast paced dynamic warmup to get blood pumping.',
        muscles: ['chest', 'front-deltoids', 'upper-back'],
      },
    ],
    workouts: [
      {
        id: 'ex-501',
        exercise_name: 'Incline Dumbbell Press',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 75,
        coach_notes: 'Deep chest stretch, explosive push.',
        primary_muscles: ['chest', 'front-deltoids'],
        secondary_muscles: ['triceps'],
        imageUrl: '',
      },
      {
        id: 'ex-502',
        exercise_name: 'Lat Pulldown',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 75,
        coach_notes: 'Wide grip, pull smoothly to clavicle.',
        primary_muscles: ['upper-back'],
        secondary_muscles: ['biceps'],
        imageUrl: '/images/exercises/lat-pulldown.png',
      },
      {
        id: 'ex-503',
        exercise_name: 'Seated Dumbbell Shoulder Press',
        target_sets: 3,
        target_reps: '10-12 reps',
        rest_seconds: 75,
        coach_notes: 'Scapular plane, full extension without lockout.',
        primary_muscles: ['front-deltoids'],
        secondary_muscles: ['triceps'],
        imageUrl: '',
      },
      {
        id: 'ex-504',
        exercise_name: 'Barbell Bicep Curl',
        target_sets: 3,
        target_reps: '12 reps',
        rest_seconds: 60,
        coach_notes: 'Finish off upper body with strict pump curls.',
        primary_muscles: ['biceps'],
        secondary_muscles: ['forearm'],
        imageUrl: '',
      },
    ],
    cardio: [
      {
        id: 'c-5',
        name: 'Jump Rope Conditioning',
        duration_minutes: 10,
        target_intensity: 'Light Boxer Bounce',
        equipment: 'Jump Rope',
        coach_notes: 'Continuous light rhythm to shake out lactate and finish strong.',
      },
    ],
    stretches: [
      {
        id: 's-8',
        name: 'Full Upper Body Wall Stretch',
        target_duration: '2 sets × 45s',
        coach_notes: 'Hands against wall, lower chest downward to decompress chest and lats.',
        muscles: ['chest', 'upper-back'],
      },
    ],
  },
  {
    day_of_week: 6,
    day_name: 'Saturday',
    target_focus: 'Lower Body & Posterior Chain',
    warmups: [
      {
        id: 'w-9',
        name: 'Glute Bridges & Walking Lunges',
        target_reps: '2 sets × 12 reps',
        duration_seconds: 180,
        coach_notes: 'Activate glute medius and hip flexors.',
        muscles: ['gluteal', 'hamstring', 'quadriceps'],
      },
    ],
    workouts: [
      {
        id: 'ex-601',
        exercise_name: 'Bulgarian Split Squat',
        target_sets: 3,
        target_reps: '10 reps each leg',
        rest_seconds: 90,
        coach_notes: 'Elevate back foot, drop back knee straight down.',
        primary_muscles: ['quadriceps', 'gluteal'],
        secondary_muscles: ['hamstring'],
        imageUrl: '',
      },
      {
        id: 'ex-602',
        exercise_name: 'Conventional Barbell Deadlift',
        target_sets: 3,
        target_reps: '6 reps',
        rest_seconds: 120,
        coach_notes: 'Maximum power from floor, lock hips forward at top.',
        primary_muscles: ['lower-back', 'hamstring', 'gluteal'],
        secondary_muscles: ['trapezius', 'forearm'],
        imageUrl: '/images/exercises/deadlift.png',
      },
    ],
    cardio: [
      {
        id: 'c-6',
        name: 'Incline Treadmill Walk',
        duration_minutes: 15,
        target_intensity: 'Zone 2 (120 BPM)',
        equipment: 'Treadmill',
        coach_notes: 'Easy recovery flush for the legs.',
      },
    ],
    stretches: [
      {
        id: 's-9',
        name: 'Seated Hamstring & Calf Reach',
        target_duration: '2 sets × 40s each leg',
        coach_notes: 'Reach forward from hips, pull toes backward for dual hamstring/calf stretch.',
        muscles: ['hamstring', 'calves'],
      },
    ],
  },
  {
    day_of_week: 7,
    day_name: 'Sunday',
    target_focus: 'Active Recovery & Full Mobility',
    warmups: [
      {
        id: 'w-10',
        name: 'Full Body Dynamic Flow & Hip Circles',
        target_reps: '5 minutes',
        duration_seconds: 300,
        coach_notes: 'Relaxed breathing, gentle range of motion through all joints.',
        muscles: ['lower-back', 'upper-back', 'gluteal', 'calves'],
      },
    ],
    workouts: [
      {
        id: 'ex-701',
        exercise_name: 'Forearm Plank',
        target_sets: 3,
        target_reps: '45-60 seconds',
        rest_seconds: 60,
        coach_notes: 'Focus on diaphragmatic breathing while keeping abs braced.',
        primary_muscles: ['abs', 'obliques'],
        secondary_muscles: ['lower-back'],
        imageUrl: '',
      },
    ],
    cardio: [
      {
        id: 'c-7',
        name: 'Outdoor or Treadmill Leisure Walk',
        duration_minutes: 30,
        target_intensity: 'Zone 1 (Under 110 BPM)',
        equipment: 'Walking Track or Treadmill',
        coach_notes: 'Parasympathetic recovery session. Promotes lymphatic drainage.',
      },
    ],
    stretches: [
      {
        id: 's-10',
        name: 'Full Body Yoga / Stretch Sequence',
        target_duration: '10 minutes',
        coach_notes: 'Downward dog to cobra to child pose. Rest and recharge.',
        muscles: ['upper-back', 'lower-back', 'hamstring', 'chest'],
      },
    ],
  },
];

// Helper to hash password
export function hashPassword(password, salt = null) {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 1000, 64, 'sha512').toString('hex');
  return { salt: chosenSalt, hash };
}

// Read admin credentials
export function getAdminCredentials() {
  if (memoryCredentials) return memoryCredentials;

  if (fs.existsSync(TMP_CREDENTIALS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_CREDENTIALS_FILE, 'utf8'));
      if (data && data.username && data.hash && data.salt) {
        memoryCredentials = data;
        return data;
      }
    } catch (e) {}
  }

  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
      if (data && data.username && data.hash && data.salt) {
        memoryCredentials = data;
        return data;
      }
    } catch (e) {
      console.warn('Error reading credentials file, resetting default:', e.message);
    }
  }

  // Default credentials: admin / gympassword123
  const { salt, hash } = hashPassword('gympassword123');
  const initial = {
    username: 'admin',
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  };
  memoryCredentials = initial;
  safeWriteJson(CREDENTIALS_FILE, TMP_CREDENTIALS_FILE, initial);
  return initial;
}

// Verify admin login password
export function verifyAdminPassword(username, password) {
  const creds = getAdminCredentials();
  if (creds.username.toLowerCase() !== username.trim().toLowerCase()) {
    return false;
  }
  const computed = crypto.pbkdf2Sync(password, creds.salt, 1000, 64, 'sha512').toString('hex');
  return computed === creds.hash;
}

// Update admin password
export function updateAdminPassword(currentPassword, newPassword, newUsername = null) {
  const creds = getAdminCredentials();
  const computed = crypto.pbkdf2Sync(currentPassword, creds.salt, 1000, 64, 'sha512').toString('hex');
  if (computed !== creds.hash) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long' };
  }

  const { salt, hash } = hashPassword(newPassword);
  const updated = {
    username: newUsername ? newUsername.trim() : creds.username,
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  };

  memoryCredentials = updated;
  safeWriteJson(CREDENTIALS_FILE, TMP_CREDENTIALS_FILE, updated);
  return { success: true, username: updated.username };
}

// Read whole schedule
export function getAllSchedules() {
  if (memorySchedules && Array.isArray(memorySchedules) && memorySchedules.length > 0) {
    return memorySchedules;
  }

  if (fs.existsSync(TMP_SCHEDULE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_SCHEDULE_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        memorySchedules = data;
        return data;
      }
    } catch (e) {}
  }

  if (fs.existsSync(SCHEDULE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        memorySchedules = data;
        return data;
      }
    } catch (err) {
      console.warn('Error reading schedule file, using default:', err.message);
    }
  }

  memorySchedules = DEFAULT_SCHEDULE;
  safeWriteJson(SCHEDULE_FILE, TMP_SCHEDULE_FILE, DEFAULT_SCHEDULE);
  return DEFAULT_SCHEDULE;
}

// Get schedule for specific day (1-7)
export function getScheduleForDay(dayOfWeek) {
  const schedules = getAllSchedules();
  const dayNum = parseInt(dayOfWeek, 10);
  const found = schedules.find((s) => s.day_of_week === dayNum);
  return found || schedules[0];
}

// Update schedule for specific day
export function updateScheduleForDay(dayOfWeek, dayData) {
  const dayNum = parseInt(dayOfWeek, 10);
  const schedules = getAllSchedules();
  const index = schedules.findIndex((s) => s.day_of_week === dayNum);

  const updatedEntry = {
    ...dayData,
    day_of_week: dayNum,
    warmups: Array.isArray(dayData.warmups) ? dayData.warmups : [],
    workouts: Array.isArray(dayData.workouts) ? dayData.workouts : [],
    cardio: Array.isArray(dayData.cardio) ? dayData.cardio : [],
    stretches: Array.isArray(dayData.stretches) ? dayData.stretches : [],
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    schedules[index] = updatedEntry;
  } else {
    schedules.push(updatedEntry);
  }

  memorySchedules = schedules;
  safeWriteJson(SCHEDULE_FILE, TMP_SCHEDULE_FILE, schedules);
  return updatedEntry;
}

// -------------------------------------------------------------
// Weekly History & Template Cloning System
// Allows trainers to load last week's exact routine or another day's
// routine and tweak specific exercises rather than typing from scratch.
// -------------------------------------------------------------

export function getLastWeekSchedules() {
  if (memoryLastWeekSchedules && Array.isArray(memoryLastWeekSchedules) && memoryLastWeekSchedules.length > 0) {
    return memoryLastWeekSchedules;
  }

  if (fs.existsSync(TMP_LAST_WEEK_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_LAST_WEEK_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        memoryLastWeekSchedules = data;
        return data;
      }
    } catch (e) {}
  }

  if (fs.existsSync(LAST_WEEK_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LAST_WEEK_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        memoryLastWeekSchedules = data;
        return data;
      }
    } catch (e) {}
  }

  // If no archived last week exists yet, snapshot the current schedule as last week baseline
  const baseline = getAllSchedules();
  memoryLastWeekSchedules = baseline;
  safeWriteJson(LAST_WEEK_FILE, TMP_LAST_WEEK_FILE, baseline);
  return baseline;
}

export function getLastWeekScheduleForDay(dayOfWeek) {
  const lastWeek = getLastWeekSchedules();
  const dayNum = parseInt(dayOfWeek, 10);
  const found = lastWeek.find((s) => s.day_of_week === dayNum);
  return found || DEFAULT_SCHEDULE.find((s) => s.day_of_week === dayNum) || DEFAULT_SCHEDULE[0];
}

export function archiveCurrentScheduleAsLastWeek() {
  const current = getAllSchedules();
  memoryLastWeekSchedules = current;
  safeWriteJson(LAST_WEEK_FILE, TMP_LAST_WEEK_FILE, current);
  return { success: true, count: current.length };
}

export function cloneScheduleForDay({ targetDay, sourceType, sourceDay }) {
  const targetNum = parseInt(targetDay, 10);
  let sourceData = null;

  if (sourceType === 'last_week') {
    sourceData = getLastWeekScheduleForDay(targetNum);
  } else if (sourceType === 'day') {
    const fromNum = parseInt(sourceDay, 10);
    sourceData = getScheduleForDay(fromNum);
  } else if (sourceType === 'standard') {
    sourceData = DEFAULT_SCHEDULE.find((s) => s.day_of_week === targetNum) || DEFAULT_SCHEDULE[0];
  } else {
    sourceData = getLastWeekScheduleForDay(targetNum);
  }

  // Deep clone and regenerate unique IDs to prevent duplicate React keys
  return {
    day_of_week: targetNum,
    day_name: sourceData.day_name,
    target_focus: sourceData.target_focus,
    source_reference: sourceType === 'last_week' ? "Last Week's Routine" : sourceType === 'standard' ? "Standard Blueprint" : `Day ${sourceDay}`,
    warmups: (sourceData.warmups || []).map((w, idx) => ({
      ...w,
      id: `w-${targetNum}-${Date.now()}-${idx}`,
    })),
    workouts: (sourceData.workouts || []).map((w, idx) => ({
      ...w,
      id: `ex-${targetNum}-${Date.now()}-${idx}`,
    })),
    cardio: (sourceData.cardio || []).map((c, idx) => ({
      ...c,
      id: `c-${targetNum}-${Date.now()}-${idx}`,
    })),
    stretches: (sourceData.stretches || []).map((s, idx) => ({
      ...s,
      id: `s-${targetNum}-${Date.now()}-${idx}`,
    })),
  };
}

// Custom exercises
export function getCustomExercises() {
  if (memoryCustomExercises && Array.isArray(memoryCustomExercises)) {
    return memoryCustomExercises;
  }

  if (fs.existsSync(TMP_CUSTOM_EXERCISES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_CUSTOM_EXERCISES_FILE, 'utf8'));
      if (Array.isArray(data)) {
        memoryCustomExercises = data;
        return data;
      }
    } catch (e) {}
  }

  if (fs.existsSync(CUSTOM_EXERCISES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CUSTOM_EXERCISES_FILE, 'utf8'));
      if (Array.isArray(data)) {
        memoryCustomExercises = data;
        return data;
      }
    } catch (e) {}
  }
  memoryCustomExercises = [];
  return [];
}

export function saveCustomExercise(exercise) {
  const existing = getCustomExercises();
  const id = exercise.id || exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const entry = {
    ...exercise,
    id,
    createdAt: new Date().toISOString(),
  };

  const filtered = existing.filter((e) => e.id !== id && e.name.toLowerCase() !== exercise.name.toLowerCase());
  filtered.push(entry);

  memoryCustomExercises = filtered;
  safeWriteJson(CUSTOM_EXERCISES_FILE, TMP_CUSTOM_EXERCISES_FILE, filtered);
  return entry;
}
