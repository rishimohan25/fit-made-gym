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
