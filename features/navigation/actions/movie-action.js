'use client';

import { REVIEW_SORT_OPTIONS } from '@/features/reviews/utils';
import MediaSocialProof from '@/features/movie/social-proof';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { Select } from '@/ui/elements';
import Icon from '@/ui/icon';

export default function MovieAction({
  mode = 'watch',
  isActive = false,
  onToggle,
  sortMode,
  onSortChange,
  socialProofMedia = null,
  socialProofViewerId = null,
  socialProofKnownMovieIds = [],
  className = 'flex-1 min-w-0 whitespace-nowrap',
}) {
  if (mode === 'sort') {
    return (
      <Select
        value={sortMode}
        onChange={onSortChange}
        options={REVIEW_SORT_OPTIONS}
        side="top"
        align="center"
        sideOffset={10}
        classNames={{
          trigger: `${getNavActionClass({
            className,
            isActive: false,
          })} justify-between`,
          value: 'truncate',
          menu: 'nav-action-select-menu overflow-hidden p-1 bottom-0',
          optionsList: 'flex flex-col gap-1',
          option: 'nav-action-select-option cursor-pointer p-3 text-xs font-semibold tracking-wide uppercase outline-none',
          optionActive: 'nav-action-select-option-active',
          indicator: 'ml-auto text-black',
          icon: 'text-black-muted',
        }}
        aria-label="Sort reviews"
      />
    );
  }

  const icon = isActive ? 'solar:arrow-left-bold' : 'solar:tv-bold';
  const label = isActive ? 'Back' : 'Where to watch?';

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2">
      <button
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle?.();
        }}
        className={getNavActionClass({
          className,
          isActive,
        })}
        type="button"
      >
        <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{label}</span>
      </button>
      {socialProofMedia ? (
        <MediaSocialProof
          media={socialProofMedia}
          viewerId={socialProofViewerId}
          knownMovieIds={socialProofKnownMovieIds}
          className="movie-action-social-proof"
        />
      ) : null}
    </div>
  );
}
