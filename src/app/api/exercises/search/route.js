import { NextResponse } from 'next/server';
import { searchExerciseDetails, searchCardioDetails, searchStretchDetails } from '@/lib/exerciseSearch';
import { saveCustomExercise } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { exerciseName, type = 'workout' } = body;

    if (!exerciseName || !exerciseName.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required for search' }, { status: 400 });
    }

    if (type === 'cardio') {
      const details = await searchCardioDetails(exerciseName);
      return NextResponse.json({
        success: true,
        type: 'cardio',
        cardio: details,
      });
    }

    if (type === 'stretch') {
      const details = await searchStretchDetails(exerciseName);
      return NextResponse.json({
        success: true,
        type: 'stretch',
        stretch: details,
      });
    }

    // Default: Workout exercise
    const details = await searchExerciseDetails(exerciseName);

    // Save to persistent custom exercises
    try {
      saveCustomExercise(details);
    } catch (saveErr) {
      console.warn('Failed to save to custom catalog:', saveErr.message);
    }

    return NextResponse.json({
      success: true,
      type: 'workout',
      exercise: details,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
