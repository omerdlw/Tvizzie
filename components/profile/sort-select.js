'use client'

import { cn } from '@/lib/utils'
import Select from '@/ui/elements/select'
import Icon from '@/ui/icon/index'

const SORT_OPTIONS = [
  { value: 'newest', label: 'NEWEST', icon: 'solar:calendar-date-bold' },
  { value: 'oldest', label: 'OLDEST', icon: 'solar:calendar-broken' },
  { value: 'rating_high', label: 'RATING (HIGH)', icon: 'solar:star-bold' },
  { value: 'rating_low', label: 'RATING (LOW)', icon: 'solar:star-linear' },
  {
    value: 'title_az',
    label: 'TITLE (A-Z)',
    icon: 'solar:sort-from-top-to-bottom-bold',
  },
  { value: 'manual', label: 'MANUAL', icon: 'solar:reorder-bold' },
]

export function SortSelect({ value, onChange, className }) {
  const currentOption =
    SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0]

  return (
    <Select
      value={value}
      onChange={onChange}
      options={SORT_OPTIONS}
      leftIcon={
        <Icon icon={currentOption.icon} size={13} className="text-white" />
      }
      className={{
        root: cn(
          'center h-8 w-fit gap-2 rounded-full border border-white/10 px-2 transition-all outline-none hover:bg-black/40 focus:border-white/20 active:scale-95',
          className
        ),
        trigger: 'center border-0 bg-transparent p-0 hover:bg-transparent',
        value:
          'flex items-center text-[11px] leading-none font-bold tracking-[0.15em] text-white/50 group-hover:text-white',
        menu: 'animate-in fade-in zoom-in-95 z-100 min-w-[170px] overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-2xl backdrop-blur-xl duration-200',
        option:
          'relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-bold tracking-[0.12em] text-white/40 transition-colors outline-none hover:bg-white/5 hover:text-white',
        optionActive: 'bg-white/10 text-white',
        indicator: 'text-primary ml-auto',
        icon: 'flex items-center justify-center opacity-50 transition-transform group-data-open:rotate-180',
      }}
      rightIcon={
        <Icon
          icon="solar:alt-arrow-down-linear"
          size={12}
          className="opacity-50"
        />
      }
    />
  )
}
