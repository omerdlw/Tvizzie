import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="max-w-md text-white/60">
        The movie you are looking for could not be found. It might have been
        removed or the ID is incorrect.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20"
      >
        Return Home
      </Link>
    </div>
  )
}
