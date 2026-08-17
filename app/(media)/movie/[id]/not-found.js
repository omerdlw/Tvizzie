import NotFoundTemplate from '@/domains/shell/layout/not-found-template';

export default function NotFound() {
  return (
    <NotFoundTemplate description="We couldn't find this movie. It may have been removed, filtered out, or the link may be invalid" />
  );
}
