import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './constants'

const CSRF_COOKIE_NAME = 'tvz_auth_csrf'
const CSRF_MAX_AGE_SECONDS = 12 * 60 * 60

function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production'
}

function createCsrfToken() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

export async function updateSession(request) {
  assertSupabaseBrowserEnv()

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        supabaseResponse = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  await supabase.auth.getClaims()

  const existingCsrf =
    request.cookies.get(CSRF_COOKIE_NAME)?.value ||
    supabaseResponse.cookies.get(CSRF_COOKIE_NAME)?.value ||
    ''

  if (!existingCsrf) {
    supabaseResponse.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
      httpOnly: false,
      maxAge: CSRF_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    })
  }

  return supabaseResponse
}
