import { NextResponse } from 'next/server';
import { getScheduleForDay, getAllSchedules, updateScheduleForDay } from '@/lib/dataStore';
import { verifyAdminTokenFromRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Helper to determine current day of the week (1 = Monday, ..., 7 = Sunday)
function getTodayDayOfWeek() {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday, ...
  return day === 0 ? 7 : day;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('day');
    const allParam = searchParams.get('all');

    if (allParam === 'true') {
      const allSchedules = getAllSchedules();
      return NextResponse.json({
        success: true,
        schedules: allSchedules,
        todayDayOfWeek: getTodayDayOfWeek(),
      });
    }

    const dayNumber = dayParam ? parseInt(dayParam, 10) : getTodayDayOfWeek();
    const schedule = getScheduleForDay(dayNumber);
    const allSchedules = getAllSchedules();

    const weekSummary = allSchedules.map((s) => ({
      day_of_week: s.day_of_week,
      day_name: s.day_name,
      target_focus: s.target_focus,
      workout_count: (s.workouts || []).length,
      warmup_count: (s.warmups || []).length,
    }));

    return NextResponse.json({
      success: true,
      day: dayNumber,
      todayDayOfWeek: getTodayDayOfWeek(),
      schedule,
      weekSummary,
    });
  } catch (error) {
    console.error('Error fetching routine:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Check admin auth
    const isAuthed = await verifyAdminTokenFromRequest(request);
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { day_of_week, day_name, target_focus, warmups, workouts, cardio, stretches } = body;

    if (!day_of_week || day_of_week < 1 || day_of_week > 7) {
      return NextResponse.json({ success: false, error: 'Invalid day_of_week (must be 1-7)' }, { status: 400 });
    }

    const updated = updateScheduleForDay(day_of_week, {
      day_name: day_name || 'Workout Day',
      target_focus: target_focus || 'Strength & Conditioning',
      warmups: Array.isArray(warmups) ? warmups : [],
      workouts: Array.isArray(workouts) ? workouts : [],
      cardio: Array.isArray(cardio) ? cardio : [],
      stretches: Array.isArray(stretches) ? stretches : [],
    });

    return NextResponse.json({
      success: true,
      schedule: updated,
      message: `Updated routine for day ${day_of_week} successfully`,
    });
  } catch (error) {
    console.error('Error updating routine:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
