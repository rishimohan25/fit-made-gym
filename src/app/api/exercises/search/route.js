import { NextResponse } from 'next/server';
import { searchExerciseDetails } from '@/lib/exerciseSearch';
import { saveCustomExercise } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { exerciseName } = body;

    if (!exerciseName || !exerciseName.trim()) {
      return NextResponse.json({ success: false, error: 'Exercise name is required' }, { status: 400 });
    }

    const details = await searchExerciseDetails(exerciseName);

    // Save to persistent custom exercises
    try {
      saveCustomExercise(details);
    } catch (saveErr) {
      console.warn('Failed to save to custom catalog:', saveErr.message);
    }

    return NextResponse.json({
      success: true,
      exercise: details,
    });
  } catch (error) {
    console.error('Exercise search error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
