'use client'

import * as Select from '@radix-ui/react-select'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/ui/icon/index'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'newest', label: 'NEWEST', icon: 'solar:calendar-date-bold' },
  { value: 'oldest', label: 'OLDEST', icon: 'solar:calendar-broken' },
  { value: 'rating_high', label: 'RATING (HIGH)', icon: 'solar:star-bold' },
  { value: 'rating_low', label: 'RATING (LOW)', icon: 'solar:star-linear' },
  { value: 'title_az', label: 'TITLE (A-Z)', icon: 'solar:sort-from-top-to-bottom-bold' },
  { value: 'manual', label: 'MANUAL', icon: 'solar:reorder-bold' },
]

export function SortSelect({ value, onChange, className }) {
  const currentOption = SORT_OPTIONS.find(opt => opt.value === value) || SORT_OPTIONS[0]

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        className={cn(
          "flex h-8 items-center justify-between gap-2.5 rounded-full border border-white/10 bg-white/5 px-4",
          "text-[10px] font-bold tracking-[0.15em] text-white/50 transition-all hover:bg-white/10 hover:text-white active:scale-95 outline-none focus:border-white/20",
          className
        )}
      >
        <div className="flex items-center gap-2">
           <Icon icon={currentOption.icon} size={13} className="text-white" />
           <Select.Value>{currentOption.label}</Select.Value>
        </div>
        <Icon icon="solar:alt-arrow-down-linear" size={12} className="opacity-40" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          align="end"
          className="z-100 min-w-[170px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/90 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
        >
          <Select.Viewport>
            {SORT_OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-bold tracking-[0.12em] text-white/40 outline-none transition-colors",
                  "hover:bg-white/5 hover:text-white data-[state=checked]:bg-white/10 data-[state=checked]:text-white"
                )}
              >
                <Icon icon={option.icon} size={14} />
                <Select.ItemText>{option.label}</Select.ItemText>
                {option.value === value && (
                   <motion.div 
                    layoutId="sort-check"
                    className="ml-auto"
                   >
                     <Icon icon="solar:check-read-bold" size={14} className="text-primary" />
                   </motion.div>
                )}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
