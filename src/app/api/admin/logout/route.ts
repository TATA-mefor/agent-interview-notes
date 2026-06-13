// POST /api/admin/logout
// Clears the admin session cookie.

import { NextResponse } from 'next/server';
import { handleLogout } from '@/lib/auth/adminAuth';

export async function POST() {
  handleLogout();

  return NextResponse.json({
    data: { loggedOut: true },
  });
}
