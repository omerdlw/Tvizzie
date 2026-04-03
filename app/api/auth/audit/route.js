import { NextResponse } from 'next/server'

import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server'

export async function POST(request) {
  try {
    const body = await request.json()

    await writeAuthAuditLog({
      request,
      eventType: body?.eventType,
      status: body?.status || 'success',
      userId: body?.userId || null,
      email: body?.email || null,
      provider: body?.provider || null,
      metadata: body?.metadata || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AuthAudit] Failed to persist audit log:', error)

    return NextResponse.json(
      { success: false, error: 'Audit log could not be persisted' },
      { status: 202 }
    )
  }
}
