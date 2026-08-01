import TermsView from '@/domains/legal/ui/terms-view';

export const metadata = {
  title: 'Terms of Service',
  description: 'The rules that govern use of the Tvizzie service.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return <TermsView />;
}
