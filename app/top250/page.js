import Top250Client from './client';
import { getTop100Data } from './data';

export const metadata = {
  title: 'IMDb Top 100 Movies',
  description: 'Browse the IMDb Top 100 movies in Tvizzie.',
  alternates: {
    canonical: '/top250',
  },
};

export const revalidate = 86400;

export default async function Top250Page() {
  const data = await getTop100Data();

  return <Top250Client data={data} />;
}
