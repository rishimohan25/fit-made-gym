import { NextResponse } from 'next/server';
import { STANDARD_EXERCISES } from '@/lib/exercises';
import { getCustomExercises } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const custom = getCustomExercises();
    const all = [...STANDARD_EXERCISES, ...custom];

    // Group by category
    const grouped = all.reduce((acc, ex) => {
      const cat = ex.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ex);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      exercises: all,
      grouped,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
