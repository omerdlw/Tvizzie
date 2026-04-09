'use client';

import AccountPaginatedListGrid from '@/features/account/lists/grid';
import { AccountSectionState } from '@/features/account/profile/section-wrapper';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

function ListCardOwnerActions({ list, onDelete, onEdit }) {
  const handleEditClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit(list);
  };

  const handleDeleteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete(list);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Edit ${list.title}`}
        onClick={handleEditClick}
        className="bg-primary/40 hover:bg-primary/70 flex size-8 items-center justify-center rounded-[12px] border border-black/10 text-black/70 transition-colors hover:border-black/20"
      >
        <Icon icon="solar:pen-bold" size={13} />
      </button>
      <Button
        variant="destructive-icon"
        aria-label={`Delete ${list.title}`}
        onClick={handleDeleteClick}
        className="size-8 rounded-[12px]"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={13} />
      </Button>
    </div>
  );
}

export default function AccountListsFeed({
  canShowLists,
  currentPage,
  isOwner,
  lists,
  username,
  onDeleteList,
  onEditList,
}) {
  if (!canShowLists) {
    return <AccountSectionState message="This profile is private." />;
  }

  return (
    <AccountPaginatedListGrid
      currentPage={currentPage}
      emptyMessage="No lists yet"
      icon="solar:list-broken"
      lists={lists}
      ownerUsername={username}
      pageBasePath={`/account/${username}/lists`}
      renderActions={(list) =>
        isOwner ? <ListCardOwnerActions list={list} onDelete={onDeleteList} onEdit={onEditList} /> : null
      }
      title="Lists"
    />
  );
}
