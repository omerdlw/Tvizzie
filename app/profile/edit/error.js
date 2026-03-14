'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="center mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
      <p className="text-sm text-white/60">
        Profile edit page could not be loaded
      </p>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-[11px] font-bold tracking-[0.14em] text-black uppercase transition hover:bg-white/90 active:scale-95"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/profile'
          }}
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-[11px] font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-white/10 active:scale-95"
        >
          Go to profile
        </button>
      </div>
    </div>
  )
}
