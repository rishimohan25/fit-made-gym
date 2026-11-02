const { fetchAndCacheExerciseDetails } = require('./src/lib/exa.js');
const { query } = require('./src/lib/db.js');

async function run() {
  console.log("Finding missing exercises...");
  const res = await query(`
    SELECT DISTINCT exercise_name 
    FROM routine_exercises 
    WHERE exercise_name NOT IN (SELECT exercise_name FROM exercise_details)
  `);
  
  const exercises = res.rows.map(r => r.exercise_name);
  console.log(`Found ${exercises.length} missing exercises: ${exercises.join(', ')}`);
  
  for (let ex of exercises) {
    console.log(`Fetching details for ${ex}...`);
    try {
      await fetchAndCacheExerciseDetails(ex);
      console.log(`Successfully fetched details for ${ex}`);
    } catch (e) {
      console.error(`Failed to fetch details for ${ex}:`, e);
    }
  }
  
  console.log("Done!");
  process.exit(0);
}

run();
