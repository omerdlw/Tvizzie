import Client from './client';

export default async function CallbackPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return <Client initialProvider={resolvedSearchParams?.provider || null} />;
}
