import { NextResponse } from 'next/server';
import { cloneScheduleForDay, archiveCurrentScheduleAsLastWeek, getLastWeekSchedules } from '@/lib/dataStore';
import { verifyAdminTokenFromRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const isAuthed = await verifyAdminTokenFromRequest(request);
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const lastWeek = getLastWeekSchedules();
    return NextResponse.json({
      success: true,
      lastWeekSummary: lastWeek.map((d) => ({
        day_of_week: d.day_of_week,
        day_name: d.day_name,
        target_focus: d.target_focus,
        workout_count: (d.workouts || []).length,
      })),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAuthed = await verifyAdminTokenFromRequest(request);
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target_day, source_type = 'last_week', source_day = 1 } = body;

    if (!target_day || target_day < 1 || target_day > 7) {
      return NextResponse.json({ success: false, error: 'Invalid target_day (must be 1-7)' }, { status: 400 });
    }

    const cloned = cloneScheduleForDay({
      targetDay: target_day,
      sourceType: source_type, // 'last_week' | 'day' | 'standard'
      sourceDay: source_day,
    });

    return NextResponse.json({
      success: true,
      schedule: cloned,
      message: `Successfully cloned workout from ${source_type === 'last_week' ? "last week's routine" : source_type === 'day' ? `day ${source_day}` : 'standard blueprint'} into Day ${target_day}`,
    });
  } catch (err) {
    console.error('Error in clone API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const isAuthed = await verifyAdminTokenFromRequest(request);
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const res = archiveCurrentScheduleAsLastWeek();
    return NextResponse.json({
      success: true,
      message: 'Current weekly schedule has been archived as Last Week baseline',
      count: res.count,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
