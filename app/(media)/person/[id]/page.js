import { generatePersonMetadata, getPersonDetailRouteData } from './page-data';
import Client from './client';

export const generateMetadata = generatePersonMetadata;

export default async function PersonDetailPage({ params }) {
  const { person, secondaryDataPromise } = await getPersonDetailRouteData(params);

  return <Client key={person.id} person={person} secondaryDataPromise={secondaryDataPromise} />;
}

export const revalidate = 3600;
