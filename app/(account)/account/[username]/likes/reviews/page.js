import { redirect } from 'next/navigation';

export default async function Page({ params }) {
  const { username } = await params;
  redirect(`/account/${username}/likes?segment=reviews`);
}
