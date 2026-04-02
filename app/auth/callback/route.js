import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

import { AUTH_ROUTE_NOTICE } from '@/lib/auth/route-notice'
import {
  normalizeGoogleAuthIntent,
  sanitizeAuthNextPath,
} from '@/lib/auth/oauth-callback'
import {
  clearAuthRouteNoticeCookie,
  setAuthRouteNoticeCookie,
} from '@/lib/auth/servers/notice/auth-route-notice.server'
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  assertSupabaseBrowserEnv,
} from '@/lib/supabase/constants'

function normalizeValue(value) {
  return String(value || '').trim()
}

function buildRouteNoticeRedirect(
  requestUrl,
  { includeNext = true, nextPath, notice, pathname }
) {
  const redirectUrl = new URL(pathname, requestUrl.origin)

  if (includeNext && nextPath) {
    redirectUrl.searchParams.set('next', nextPath)
  }

  if (notice) {
    redirectUrl.searchParams.set('notice', notice)
  }

  return redirectUrl
}

function resolveFailureRedirectUrl(requestUrl, nextPath, intent) {
  if (intent === 'sign-up') {
    return buildRouteNoticeRedirect(requestUrl, {
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      pathname: '/sign-up',
    })
  }

  if (intent === 'sign-in') {
    return buildRouteNoticeRedirect(requestUrl, {
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      pathname: '/sign-in',
    })
  }

  return buildRouteNoticeRedirect(requestUrl, {
    includeNext: false,
    notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
    pathname: nextPath,
  })
}

export async function GET(request) {
  assertSupabaseBrowserEnv()

  const requestUrl = new URL(request.url)
  const nextPath = sanitizeAuthNextPath(requestUrl.searchParams.get('next'))
  const intent = normalizeGoogleAuthIntent(
    requestUrl.searchParams.get('intent'),
    'sign-in'
  )
  const code = normalizeValue(requestUrl.searchParams.get('code'))
  const successRedirectUrl = new URL(nextPath, requestUrl.origin)

  if (!code) {
    const failureResponse = NextResponse.redirect(
      resolveFailureRedirectUrl(requestUrl, nextPath, intent)
    )

    setAuthRouteNoticeCookie(failureResponse, AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED)

    return failureResponse
  }

  let response = NextResponse.redirect(successRedirectUrl)

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        response = NextResponse.redirect(successRedirectUrl)

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const failureResponse = NextResponse.redirect(
      resolveFailureRedirectUrl(requestUrl, nextPath, intent)
    )

    setAuthRouteNoticeCookie(failureResponse, AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED)

    return failureResponse
  }

  clearAuthRouteNoticeCookie(response)

  return response
}
