import { notFound, redirect } from 'next/navigation'

export default async function Page({ params }) {
  const { page, username } = await params
  const pageNumber = Number.parseInt(page, 10)

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound()
  }

  redirect(
    pageNumber === 1
      ? `/account/${username}/likes`
      : `/account/${username}/likes?page=${pageNumber}`
  )
}
