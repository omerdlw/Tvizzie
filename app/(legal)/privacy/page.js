import PrivacyDocument from '@/domains/legal/ui/documents/privacy-document';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Tvizzie collects, uses, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return <PrivacyDocument />;
}
