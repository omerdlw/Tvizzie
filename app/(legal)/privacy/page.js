export const dynamic = 'force-dynamic';

import PrivacyClient from '@/app/(legal)/privacy/client';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Tvizzie collects, uses, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
