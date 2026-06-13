// POST /api/admin/login
// Authenticates admin password, sets httpOnly cookie session.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  handleLogin,
  isValidAdminRole,
  normalizeAdminRole,
  createSessionCookie,
  setSessionCookie,
} from '@/lib/auth/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === 'string' ? body.password : '';
    const requestedRole = body.role ?? 'admin';

    // If role explicitly provided, validate it
    if (body.role !== undefined && typeof body.role !== 'string') {
      return NextResponse.json(
        { error: 'Invalid role.' },
        { status: 400 },
      );
    }

    const result = handleLogin(password, requestedRole);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid credentials.' },
        { status: 401 },
      );
    }

    // Set session cookie
    const cookieStore = cookies();
    const sessionCookie = createSessionCookie(result.role!);
    setSessionCookie(cookieStore, sessionCookie);

    return NextResponse.json({
      data: { role: result.role },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
