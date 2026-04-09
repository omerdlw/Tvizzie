'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { ACCOUNT_LIST_CREATOR_PATH } from '@/features/account/utils';
import { useAccountSectionPage } from '@/features/account/hooks/section-page';
import { useAuth } from '@/core/modules/auth';
import ListsView from './view';

export default function Client({
  currentPage = 1,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  username,
}) {
  const auth = useAuth();
  const router = useRouter();

  const {
    canViewProfileCollections,
    followerCount,
    followingCount,
    followState,
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isResolvingProfile,
    itemRemoveConfirmation,
    likeCount,
    listCount,
    listDeleteConfirmation,
    lists,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeTab: 'lists',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const handleOpenListCreator = useCallback(() => {
    router.push(ACCOUNT_LIST_CREATOR_PATH);
  }, [router]);

  return (
    <ListsView
      auth={auth}
      canShowLists={canViewProfileCollections}
      currentPage={currentPage}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      likeCount={likeCount}
      listDeleteConfirmation={listDeleteConfirmation}
      listCount={listCount}
      lists={lists}
      onCreateList={handleOpenListCreator}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchlistCount={watchlistCount}
    />
  );
}
