import { AccountNotFoundState } from '@/domains/account/ui/components/layout';

export default function NotFound() {
  return (
    <AccountNotFoundState description="This account page is unavailable right now, or the link you followed is no longer valid." />
  );
}
