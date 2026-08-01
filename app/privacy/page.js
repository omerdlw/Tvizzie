import PrivacyView from '@/domains/legal/screens/privacy-page';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Tvizzie collects, uses, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
