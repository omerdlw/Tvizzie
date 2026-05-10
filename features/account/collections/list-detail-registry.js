export default function ListDetailRegistry({ model = null, RegistryComponent = null }) {
  if (!RegistryComponent) {
    return null;
  }

  const {
    auth,
    followState,
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    handleToggleLike,
    isBioSurfaceOpen,
    isFollowLoading,
    isLiked,
    isLikeLoading,
    isOwner,
    isPageLoading,
    isResolvingProfile,
    itemRemoveConfirmation,
    list,
    listDeleteConfirmation,
    listItems = [],
    pendingFollowRequestCount,
    profile,
    resolveError,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    username,
  } = model || {};

  return (
    <RegistryComponent
      auth={auth}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleToggleLike={handleToggleLike}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      list={list}
      listItemsCount={listItems.length}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  );
}
