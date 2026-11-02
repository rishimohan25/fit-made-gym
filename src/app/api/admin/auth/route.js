import { NextResponse } from 'next/server';
import { verifyAdminPassword, updateAdminPassword, getAdminCredentials } from '@/lib/dataStore';
import { signAdminToken, verifyAdminTokenFromRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const admin = await verifyAdminTokenFromRequest(request);
    if (!admin) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    const creds = getAdminCredentials();
    return NextResponse.json({
      authenticated: true,
      username: creds.username,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // LOGIN
    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
      }

      const isValid = verifyAdminPassword(username, password);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
      }

      const token = signAdminToken(username);
      const response = NextResponse.json({
        success: true,
        message: 'Admin login successful',
        username,
        token,
      });

      // Set cookie for 7 days
      response.cookies.set('gym_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }

    // CHANGE PASSWORD
    if (action === 'change-password') {
      const isAuthed = await verifyAdminTokenFromRequest(request);
      if (!isAuthed) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Please log in first' }, { status: 401 });
      }

      const { currentPassword, newPassword, newUsername } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, error: 'Current password and new password required' }, { status: 400 });
      }

      const result = updateAdminPassword(currentPassword, newPassword, newUsername);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      const token = signAdminToken(result.username);
      const response = NextResponse.json({
        success: true,
        message: 'Password updated successfully',
        username: result.username,
        token,
      });

      response.cookies.set('gym_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }

    // LOGOUT
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out' });
      response.cookies.delete('gym_admin_token');
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
