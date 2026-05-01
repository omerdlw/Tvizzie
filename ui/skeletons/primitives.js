import { cn } from '@/core/utils';

export const SKELETON_TOKENS = Object.freeze({
  tone: Object.freeze({
    solid: 'skeleton-block',
    soft: 'skeleton-block-soft',
  }),
  radius: Object.freeze({
    hero: '',
    card: '',
    control: '',
    field: '',
    segmentedTrack: '',
    segmentedItem: '',
    full: '',
  }),
  gap: Object.freeze({
    page: 'gap-8',
    section: 'gap-6',
    stack: 'gap-3',
    compact: 'gap-2',
  }),
  lineHeight: Object.freeze({
    xs: 'h-2.5',
    sm: 'h-3',
    md: 'h-3.5',
    lg: 'h-4',
    xl: 'h-8',
  }),
});

function resolveRadius(radius) {
  return SKELETON_TOKENS.radius[radius] || radius || '';
}

function resolveLineHeight(size) {
  return SKELETON_TOKENS.lineHeight[size] || size || SKELETON_TOKENS.lineHeight.md;
}

export function SkeletonBlock({ className = '', radius = null, soft = false }) {
  return (
    <div
      className={cn(soft ? SKELETON_TOKENS.tone.soft : SKELETON_TOKENS.tone.solid, resolveRadius(radius), className)}
    />
  );
}

export function SkeletonLine({ className = '', size = 'md', soft = false }) {
  return <SkeletonBlock soft={soft} radius="full" className={cn(resolveLineHeight(size), className)} />;
}

export function SkeletonPill({ className = '', radius = 'control', soft = false }) {
  return <SkeletonBlock soft={soft} radius={radius} className={className} />;
}

export function SkeletonPoster({ className = '', radius = 'card', soft = false }) {
  return <SkeletonBlock soft={soft} radius={radius} className={cn('aspect-2/3 w-full', className)} />;
}

export function SkeletonCircle({ className = '', soft = false }) {
  return <SkeletonBlock soft={soft} radius="full" className={className} />;
}
