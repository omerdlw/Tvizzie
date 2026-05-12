'use client';

import { AccountMotionItem } from '@/app/(account)/account/motion';
import { getMediaTitle as getAccountMediaTitle } from '../item-utils';
import AccountInlineSectionState from '@/features/account/components/section-wrapper';
import AccountSectionLayout from '@/features/account/components/section-wrapper';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

function ReorderableListItem({ item, renderEditAction }) {
  return (
    <div className="relative w-full">
      <div className="flex w-full items-center gap-2 border border-white/15 bg-black/40 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{getAccountMediaTitle(item)}</p>
        {typeof renderEditAction === 'function' ? <div className="shrink-0">{renderEditAction(item)}</div> : null}
      </div>
    </div>
  );
}

export default function FavoriteShowcaseManager({ items = [], isSaving = false, onRemoveItem, revealIndex = 0 }) {
  return (
    <AccountSectionLayout
      icon="solar:star-bold"
      revealIndex={revealIndex}
      summaryLabel={`${items.length} of 5 selected`}
      title="Favorites Showcase"
    >
      {items.length === 0 ? (
        <AccountInlineSectionState>No showcase titles selected yet</AccountInlineSectionState>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <AccountMotionItem
              key={`${item.id || item.mediaKey || item.entityId || 'media-item'}-${index}`}
              index={index}
            >
              <ReorderableListItem
                item={item}
                renderEditAction={(entry) => (
                  <Button
                    variant="destructive-icon"
                    aria-label={`Remove ${entry?.title || entry?.name || 'title'} from favorites showcase`}
                    disabled={isSaving}
                    className=""
                    onClick={() => onRemoveItem(entry)}
                  >
                    <Icon icon="solar:trash-bin-trash-bold" size={16} />
                  </Button>
                )}
              />
            </AccountMotionItem>
          ))}
        </div>
      )}
    </AccountSectionLayout>
  );
}
