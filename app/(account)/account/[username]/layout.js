import ProfileLayout, { AccountNotFoundState } from '@/domains/account/ui/layouts/account-layout';
import { getUsernameAccountSnapshot } from '@/domains/account/server/page-data';
import { PageGradientShell } from '@/ui/layouts/page-gradient-shell';

export default async function AccountUserLayout({ children, params }) {
  const resolvedParams = await params;
  const username = resolvedParams?.username || null;

  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot?.initialResolvedUserId || !snapshot?.initialProfile) {
    return (
      <PageGradientShell className="overflow-hidden">
        <AccountNotFoundState />
      </PageGradientShell>
    );
  }

  const { initialProfile: profile, initialCounts } = snapshot;

  return (
    <ProfileLayout
      profile={profile}
      likesCount={initialCounts?.likes ?? profile?.likesCount ?? 0}
      followerCount={profile?.followerCount ?? 0}
      followingCount={profile?.followingCount ?? 0}
      listsCount={initialCounts?.lists ?? profile?.listsCount ?? 0}
      watchedCount={initialCounts?.watched ?? profile?.watchedCount ?? 0}
      watchlistCount={initialCounts?.watchlist ?? profile?.watchlistCount ?? 0}
      username={username}
    >
      {children}
    </ProfileLayout>
  );
}
