import Exa from 'exa-js';
import { MUSCLE_LABEL_MAP } from './exercises.js';

const VALID_MUSCLES = Object.keys(MUSCLE_LABEL_MAP);

// Common exercise keyword fallback catalog (100% offline & free)
const HEURISTIC_PATTERNS = [
  {
    regex: /arnold/i,
    primary: ['front-deltoids'],
    secondary: ['triceps', 'trapezius'],
    category: 'Shoulders',
    notes: 'Rotate dumbbells as you press upward, engaging anterior and lateral deltoids.',
  },
  {
    regex: /landmine/i,
    primary: ['chest', 'front-deltoids'],
    secondary: ['triceps', 'abs'],
    category: 'Chest',
    notes: 'Stand with angled barbell, press upwards with tight core for joint-friendly chest/shoulder overload.',
  },
  {
    regex: /hip\s*thrust/i,
    primary: ['gluteal'],
    secondary: ['hamstring', 'quadriceps'],
    category: 'Legs',
    notes: 'Upper back against bench, barbell across hips, drive through heels to full glute contraction.',
  },
  {
    regex: /nordic/i,
    primary: ['hamstring'],
    secondary: ['calves', 'gluteal'],
    category: 'Legs',
    notes: 'Feet anchored, control forward descent using eccentric hamstring strength.',
  },
  {
    regex: /hack\s*squat/i,
    primary: ['quadriceps'],
    secondary: ['gluteal', 'calves'],
    category: 'Legs',
    notes: 'Back supported on machine, descend until thighs are parallel with sled.',
  },
  {
    regex: /sissy\s*squat/i,
    primary: ['quadriceps'],
    secondary: ['knees', 'abs'],
    category: 'Legs',
    notes: 'Lean back while bending knees forward, massive isolated stretch on the rectus femoris.',
  },
  {
    regex: /pendlay|seal\s*row/i,
    primary: ['upper-back', 'trapezius'],
    secondary: ['biceps', 'lower-back'],
    category: 'Back',
    notes: 'Strict row from dead stop on floor, explosive pull to lower chest.',
  },
  {
    regex: /dragon\s*flag/i,
    primary: ['abs'],
    secondary: ['obliques', 'lower-back'],
    category: 'Core',
    notes: 'Shoulders on bench, raise and lower straight body without bending at waist.',
  },
  {
    regex: /pullover/i,
    primary: ['chest', 'upper-back'],
    secondary: ['triceps'],
    category: 'Chest',
    notes: 'Reach dumbbell back behind head over bench, deep stretch through chest and serratus.',
  },
  {
    regex: /shrug/i,
    primary: ['trapezius'],
    secondary: ['forearm', 'neck'],
    category: 'Shoulders',
    notes: 'Elevate clavicles straight toward ears, pause at peak, avoid rolling shoulders.',
  },
  {
    regex: /incline.*press|bench/i,
    primary: ['chest'],
    secondary: ['triceps', 'front-deltoids'],
    category: 'Chest',
    notes: 'Retract scapulae, control eccentric phase, press through mid-chest.',
  },
  {
    regex: /row|pulldown|chin|pull-up/i,
    primary: ['upper-back'],
    secondary: ['biceps', 'trapezius', 'forearm'],
    category: 'Back',
    notes: 'Initiate with scapular depression, drive elbows back towards torso.',
  },
  {
    regex: /squat|lunge|leg\s*press/i,
    primary: ['quadriceps', 'gluteal'],
    secondary: ['hamstring'],
    category: 'Legs',
    notes: 'Hips and knees hinge together, push through mid-foot with upright spine.',
  },
  {
    regex: /curl/i,
    primary: ['biceps'],
    secondary: ['forearm'],
    category: 'Arms',
    notes: 'Isolate elbows at sides, eliminate swinging momentum.',
  },
  {
    regex: /extension|pushdown|dip/i,
    primary: ['triceps'],
    secondary: ['forearm'],
    category: 'Arms',
    notes: 'Elbow extension against load, full squeeze at lockout.',
  },
  {
    regex: /raise|deltoid|overhead/i,
    primary: ['front-deltoids'],
    secondary: ['trapezius'],
    category: 'Shoulders',
    notes: 'Control movement without swinging, maintain steady tension across deltoid heads.',
  },
  {
    regex: /deadlift|rdl|good\s*morning/i,
    primary: ['hamstring', 'lower-back', 'gluteal'],
    secondary: ['trapezius', 'forearm'],
    category: 'Legs',
    notes: 'Hip hinge mechanics, keep barbell close to body throughout movement.',
  },
  {
    regex: /plank|crunch|situp|ab\b/i,
    primary: ['abs'],
    secondary: ['obliques', 'lower-back'],
    category: 'Core',
    notes: 'Brace abdominal wall tightly, avoid straining neck.',
  },
];

// Heuristic patterns for Cardio Conditioning Drills
const CARDIO_HEURISTIC_PATTERNS = [
  {
    regex: /assault|air.*bike|echo|fan.*bike/i,
    equipment: 'Assault / Air Bike',
    duration_minutes: 15,
    target_intensity: 'HIIT (20s sprint / 40s easy)',
    coach_notes: 'Drive forcefully with both handles and pedals. Maintain explosive cadence during sprints.',
  },
  {
    regex: /row|concept2|ergometer/i,
    equipment: 'Rowing Ergometer',
    duration_minutes: 20,
    target_intensity: 'Zone 2 Steady State (125-135 BPM)',
    coach_notes: 'Leg drive first, hip swing second, arm draw last. Maintain 24-26 strokes per minute.',
  },
  {
    regex: /treadmill|incline.*walk|12-3-30/i,
    equipment: 'Treadmill',
    duration_minutes: 20,
    target_intensity: 'Zone 2 Fat Burn (120-130 BPM)',
    coach_notes: 'Set incline to 10-12%, speed 3.0-3.5 mph. Do not grip the side handrails.',
  },
  {
    regex: /stairmaster|stairs|stepmill/i,
    equipment: 'StairMaster',
    duration_minutes: 15,
    target_intensity: 'Zone 3 Aerobic (135-150 BPM)',
    coach_notes: 'Step firmly through whole foot, keep spine upright without slouching on handles.',
  },
  {
    regex: /jump.*rope|skipping/i,
    equipment: 'Speed Jump Rope',
    duration_minutes: 12,
    target_intensity: 'Intervals (60s jumping / 30s rest)',
    coach_notes: 'Bounce softly on the balls of your feet. Turn the rope primarily from the wrists.',
  },
  {
    regex: /battle.*rope/i,
    equipment: 'Heavy Battle Ropes',
    duration_minutes: 10,
    target_intensity: 'Tabata (20s max effort / 10s rest)',
    coach_notes: 'Maintain athletic quarter-squat base, drive continuous alternating high-amplitude waves.',
  },
  {
    regex: /sled|prowler/i,
    equipment: 'Weight Sled / Prowler',
    duration_minutes: 12,
    target_intensity: 'Power Endurance (40m pushes)',
    coach_notes: 'Hips locked, 45-degree forward torso lean, drive relentlessly through forefoot.',
  },
  {
    regex: /kettlebell.*swing/i,
    equipment: 'Kettlebell (16kg-24kg)',
    duration_minutes: 12,
    target_intensity: 'EMOM (15 swings every minute on the minute)',
    coach_notes: 'Hinge hips backwards, snap glutes forward explosively at top.',
  },
];

// Heuristic patterns for Stretches & Mobility
const STRETCH_HEURISTIC_PATTERNS = [
  {
    regex: /couch/i,
    muscles: ['quadriceps', 'gluteal'],
    target_duration: '90 seconds per side',
    coach_notes: 'Back knee tight against wall/bench, squeeze glute forward to release deep hip flexors.',
  },
  {
    regex: /pigeon/i,
    muscles: ['gluteal', 'hamstring'],
    target_duration: '60-90 seconds per side',
    coach_notes: 'Front shin angled on floor, square hips towards ground, breathe deeply into glute stretch.',
  },
  {
    regex: /pec|chest|doorway/i,
    muscles: ['chest', 'front-deltoids'],
    target_duration: '60 seconds',
    coach_notes: 'Forearm flush on doorframe at 90 degrees, step forward gently and rotate torso away.',
  },
  {
    regex: /world.*greatest/i,
    muscles: ['gluteal', 'hamstring', 'upper-back', 'calves'],
    target_duration: '5 reps each side (hold 5s)',
    coach_notes: 'Deep runner lunge with elbow drop to instep, followed by skyward thoracic rotation.',
  },
  {
    regex: /90.*90|hip.*capsule/i,
    muscles: ['gluteal', 'obliques'],
    target_duration: '60 seconds per side',
    coach_notes: 'Both knees at 90 degrees on floor, tall proud chest, hinge forward from the hips.',
  },
  {
    regex: /hamstring/i,
    muscles: ['hamstring', 'calves'],
    target_duration: '60 seconds per leg',
    coach_notes: 'Heel elevated on bench/box, hinge at hips with flat back until deep stretch in hamstring belly.',
  },
  {
    regex: /calf|calves|soleus/i,
    muscles: ['calves'],
    target_duration: '45 seconds per side',
    coach_notes: 'Ball of foot against step or wall, drop heel down with straight knee, then slight bend.',
  },
  {
    regex: /child.*pose|lat/i,
    muscles: ['upper-back', 'lower-back'],
    target_duration: '90 seconds',
    coach_notes: 'Knees wide on floor, sink hips back to heels, extend fingertips forward to elongate latissimus.',
  },
];

// Helper to extract muscle recruitment directly from search text
function extractMusclesFromText(text) {
  const lower = text.toLowerCase();
  const matched = [];
  const keywordMap = {
    'chest': ['chest', 'pec', 'pectoral', 'pectoralis'],
    'front-deltoids': ['front delt', 'anterior delt', 'shoulder press', 'overhead press', 'military press'],
    'back-deltoids': ['rear delt', 'posterior delt', 'face pull'],
    'biceps': ['bicep', 'biceps brachii', 'brachialis'],
    'triceps': ['tricep', 'triceps brachii'],
    'forearm': ['forearm', 'wrist flexor', 'grip'],
    'upper-back': ['lat', 'latissimus', 'rhomboid', 'upper back', 'mid back', 'lats'],
    'trapezius': ['trap', 'trapezius', 'shrug'],
    'lower-back': ['lower back', 'erector spinae'],
    'abs': ['abdom', 'abs', 'rectus abdominis', 'core'],
    'obliques': ['oblique', 'side abs'],
    'quadriceps': ['quad', 'quadriceps', 'vastus', 'front thigh'],
    'hamstring': ['hamstring', 'biceps femoris'],
    'gluteal': ['glute', 'gluteus', 'buttock'],
    'calves': ['calf', 'calves', 'gastrocnemius', 'soleus'],
  };

  for (const [muscleKey, terms] of Object.entries(keywordMap)) {
    if (terms.some((term) => lower.includes(term))) {
      matched.push(muscleKey);
    }
  }

  return matched;
}

export async function searchExerciseDetails(exerciseName) {
  const query = exerciseName.trim();
  let webText = '';
  let discoveredImage = '';

  // 1. Search via Exa API (Free & Fast)
  if (process.env.EXA_API_KEY) {
    try {
      const exa = new Exa(process.env.EXA_API_KEY);
      const res = await exa.searchAndContents(`${query} gym exercise muscles worked how to perform anatomy`, {
        type: 'neural',
        numResults: 2,
        text: { maxCharacters: 800 },
      });

      if (res && res.results && res.results.length > 0) {
        webText = res.results.map((r) => `${r.title}\n${r.text}`).join('\n\n');
        // Extract any image url from Exa metadata if present
        for (const item of res.results) {
          if (item.image) {
            discoveredImage = item.image;
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Exa search notice:', err.message);
    }
  }

  // 2. Extract muscle groups from Exa search text
  if (webText) {
    const extracted = extractMusclesFromText(webText);
    if (extracted.length > 0) {
      const primary = extracted.slice(0, 2);
      const secondary = extracted.slice(2, 4);

      // Clean snippet for coach note
      const sentences = webText
        .split(/[.\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25 && s.length < 160 && !s.includes('http'));
      const coachNote = sentences.length > 0
        ? sentences[0]
        : `Execute ${query} with controlled cadence and full muscular engagement.`;

      return {
        id: query.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: query,
        category: 'Strength',
        primaryMuscles: primary,
        secondaryMuscles: secondary,
        defaultSets: 3,
        defaultReps: '10-12 reps',
        restSeconds: 60,
        coachNotes: coachNote,
        imageUrl: discoveredImage || '',
        source: 'exa_web_search',
      };
    }
  }

  // 3. Robust biomechanical pattern matching fallback
  for (const item of HEURISTIC_PATTERNS) {
    if (item.regex.test(query)) {
      return {
        id: query.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: query,
        category: item.category,
        primaryMuscles: item.primary,
        secondaryMuscles: item.secondary,
        defaultSets: 3,
        defaultReps: '10-12 reps',
        restSeconds: 60,
        coachNotes: item.notes,
        imageUrl: '',
        source: 'biomechanical_catalog',
      };
    }
  }

  // 4. Default fallback
  return {
    id: query.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: query,
    category: 'Full Body',
    primaryMuscles: ['chest', 'quadriceps'],
    secondaryMuscles: ['abs', 'front-deltoids'],
    defaultSets: 3,
    defaultReps: '10-12 reps',
    restSeconds: 60,
    coachNotes: `Maintain strict posture and controlled tempo while executing ${query}.`,
    imageUrl: '',
    source: 'fallback_generic',
  };
}

// Search Cardio Conditioning Protocol
export async function searchCardioDetails(cardioName) {
  const query = cardioName.trim();
  let webText = '';

  // 1. Search via Exa API
  if (process.env.EXA_API_KEY) {
    try {
      const exa = new Exa(process.env.EXA_API_KEY);
      const res = await exa.searchAndContents(`${query} cardio conditioning equipment target heart rate protocol duration gym`, {
        type: 'neural',
        numResults: 2,
        text: { maxCharacters: 800 },
      });

      if (res && res.results && res.results.length > 0) {
        webText = res.results.map((r) => `${r.title}\n${r.text}`).join('\n\n');
      }
    } catch (err) {
      console.warn('Exa cardio search notice:', err.message);
    }
  }

  // 2. Parse Exa Text if available
  if (webText) {
    const sentences = webText
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 160 && !s.includes('http'));
    const note = sentences.length > 0 ? sentences[0] : `Perform ${query} maintaining consistent breathing and target intensity zone.`;

    return {
      id: `c-${Date.now()}`,
      name: query,
      duration_minutes: 20,
      equipment: query.includes('Bike') ? 'Stationary / Air Bike' : query.includes('Row') ? 'Rowing Machine' : query.includes('Rope') ? 'Jump Rope' : 'Gym Cardio Equipment',
      target_intensity: 'Zone 2 (120-135 BPM)',
      coach_notes: note,
      source: 'exa_web_search',
    };
  }

  // 3. Fallback to heuristic patterns
  for (const item of CARDIO_HEURISTIC_PATTERNS) {
    if (item.regex.test(query)) {
      return {
        id: `c-${Date.now()}`,
        name: query,
        duration_minutes: item.duration_minutes,
        equipment: item.equipment,
        target_intensity: item.target_intensity,
        coach_notes: item.coach_notes,
        source: 'cardio_catalog',
      };
    }
  }

  // 4. Generic fallback
  return {
    id: `c-${Date.now()}`,
    name: query,
    duration_minutes: 15,
    equipment: 'Cardio Station / Track',
    target_intensity: 'Zone 2 Conditioning (125-135 BPM)',
    coach_notes: `Maintain steady cadence and controlled breathing throughout ${query}.`,
    source: 'cardio_fallback',
  };
}

// Search Stretches & Mobility Protocol
export async function searchStretchDetails(stretchName) {
  const query = stretchName.trim();
  let webText = '';

  // 1. Search via Exa API
  if (process.env.EXA_API_KEY) {
    try {
      const exa = new Exa(process.env.EXA_API_KEY);
      const res = await exa.searchAndContents(`${query} mobility stretch post-workout cues targeted muscles duration how to perform`, {
        type: 'neural',
        numResults: 2,
        text: { maxCharacters: 800 },
      });

      if (res && res.results && res.results.length > 0) {
        webText = res.results.map((r) => `${r.title}\n${r.text}`).join('\n\n');
      }
    } catch (err) {
      console.warn('Exa stretch search notice:', err.message);
    }
  }

  // 2. Parse Exa Text if available
  if (webText) {
    const extractedMuscles = extractMusclesFromText(webText);
    const sentences = webText
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 160 && !s.includes('http'));
    const note = sentences.length > 0 ? sentences[0] : `Sink gently into the stretch, exhaling on each deepening phase.`;

    return {
      id: `s-${Date.now()}`,
      name: query,
      target_duration: '60-90 seconds per side',
      muscles: extractedMuscles.length > 0 ? extractedMuscles.slice(0, 3) : ['hamstring', 'gluteal'],
      coach_notes: note,
      source: 'exa_web_search',
    };
  }

  // 3. Fallback to heuristic patterns
  for (const item of STRETCH_HEURISTIC_PATTERNS) {
    if (item.regex.test(query)) {
      return {
        id: `s-${Date.now()}`,
        name: query,
        target_duration: item.target_duration,
        muscles: item.muscles,
        coach_notes: item.coach_notes,
        source: 'stretch_catalog',
      };
    }
  }

  // 4. Generic fallback
  return {
    id: `s-${Date.now()}`,
    name: query,
    target_duration: '60 seconds',
    muscles: ['hamstring', 'upper-back'],
    coach_notes: `Take deep diaphragmatic breaths and relax into the stretch for ${query}. Avoid bouncing.`,
    source: 'stretch_fallback',
  };
}
