import Top250Client from './client';
import { getTop250Data } from './data';

export const metadata = {
  title: 'IMDb Top 250 Movies',
  description: 'Browse the IMDb Top 250 movies in Tvizzie.',
  alternates: {
    canonical: '/top250',
  },
};

export const revalidate = 86400;

export default async function Top250Page() {
  const data = await getTop250Data();

  return <Top250Client data={data} />;
}
