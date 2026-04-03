import AccountPaginatedListGrid from '@/features/account/lists/paginated-list-grid'
import AccountPageShell from '@/features/account/page-shell'
import AccountSectionState from '@/features/account/section-state'
import Icon from '@/ui/icon'
import Registry from './registry'
import { Button } from '@/ui/elements/index'

function ListCardOwnerActions({ list, onDelete, onEdit }) {
  const handleEditClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onEdit(list)
  }

  const handleDeleteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete(list)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Edit ${list.title}`}
        onClick={handleEditClick}
        className="center size-9 border border-white/5  text-white transition hover:border-white/10 hover:bg-white/5"
      >
        <Icon icon="solar:pen-bold" size={13} />
      </button>
      <Button
        variant="destructive-icon"
        aria-label={`Delete ${list.title}`}
        onClick={handleDeleteClick}
        className="size-9"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={13} />
      </Button>
    </div>
  )
}

export default function ListsView({
  auth,
  canShowLists,
  currentPage,
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
  likeCount,
  itemRemoveConfirmation,
  listDeleteConfirmation,
  listCount,
  lists,
  onCreateList,
  pendingFollowRequestCount,
  profile,
  resolveError,
  resolvedUserId,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  watchlistCount,
}) {
  const pageRegistry = (
    <Registry
      auth={auth}
      followState={followState}
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
      listDeleteConfirmation={listDeleteConfirmation}
      onCreateList={onCreateList}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  )

  return (
    <AccountPageShell
      activeSection="lists"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      onReadMore={() => setIsBioSurfaceOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="lists"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowLists ? (
        <AccountPaginatedListGrid
          currentPage={currentPage}
          emptyMessage="No lists yet"
          icon="solar:list-broken"
          lists={lists}
          pageBasePath={`/account/${username}/lists`}
          renderActions={(list) =>
            isOwner ? (
              <ListCardOwnerActions
                list={list}
                onDelete={handleDeleteList}
                onEdit={handleEditList}
              />
            ) : null
          }
          title="Lists"
        />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  )
}
