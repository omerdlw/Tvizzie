import { NextResponse } from 'next/server';

import { requireProtectedSession } from '@/domains/auth/server/session.js';
import {
  getSessionDeviceLabel,
  listAuthSessions,
} from '@/domains/auth/server/security-surfaces.js';

function maskIp(value) {
  const ip = String(value || '').trim();
  if (!ip) return null;
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}:…`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts.slice(0, 3).join('.')}.…` : '…';
}

export async function GET(request) {
  try {
    const session = await requireProtectedSession(request, { allowBearerFallback: false });
    const sessions = await listAuthSessions({
      currentSessionId: session.sessionJti,
      userId: session.userId,
    });

    return NextResponse.json({
      sessions: sessions.map((item) => ({
        aal: item.aal,
        createdAt: item.createdAt,
        deviceLabel: getSessionDeviceLabel(item.userAgent),
        id: item.id,
        ip: maskIp(item.ip),
        isCurrent: item.isCurrent,
        lastActiveAt: item.updatedAt || item.refreshedAt || item.createdAt,
        userAgent: item.userAgent,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { code: error?.code || null, error: error?.message || 'Sessions could not be loaded' },
      { status: Number.isInteger(error?.status) ? error.status : 401 },
    );
  }
}
