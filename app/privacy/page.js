import PrivacyView from './view';

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
