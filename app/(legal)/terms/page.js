import TermsDocument from '@/domains/legal/ui/documents/terms-document';

export const metadata = {
  title: 'Terms of Service',
  description: 'The rules that govern use of the Tvizzie service',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return <TermsDocument />;
}
