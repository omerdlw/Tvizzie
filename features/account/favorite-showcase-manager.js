'use client';

import { MediaGrid } from '@/features/account/sections/media-grid';
import Icon from '@/ui/icon';
import { Button } from '@/ui/elements';
import AccountSectionLayout from './section-layout';

export default function FavoriteShowcaseManager({ items = [], isSaving = false, onRemoveItem, onReorder }) {
  return (
    <AccountSectionLayout icon="solar:star-bold" summaryLabel={`${items.length}/5 selected`} title="Favorites Showcase">
      {items.length === 0 ? (
        <div className="border border-[#0284c7] p-4 text-sm text-black/70">No showcase titles selected yet.</div>
      ) : (
        <MediaGrid
          items={items}
          editMode
          onReorder={onReorder}
          renderEditAction={(item) => (
            <Button
              variant="destructive-icon"
              aria-label={`Remove ${item?.title || item?.name || 'title'} from favorites showcase`}
              disabled={isSaving}
              onClick={() => onRemoveItem(item)}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={16} />
            </Button>
          )}
        />
      )}
    </AccountSectionLayout>
  );
}
