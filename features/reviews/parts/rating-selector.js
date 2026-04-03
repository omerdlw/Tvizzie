'use client'

import { cn } from '@/core/utils'
import Icon from '@/ui/icon'

const SCORES = [1, 2, 3, 4, 5, 0.5, 1.5, 2.5, 3.5, 4.5]

export default function RatingSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon="solar:star-bold" size={15} className="text-warning" />
          <span className="text-[11px] font-semibold tracking-widest text-white/70 uppercase">
            Your Score
          </span>
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] font-semibold tracking-widest text-white/50 uppercase transition hover:text-white"
          >
            Clear
          </button>
        ) : (
          <span className="text-[11px] font-semibold tracking-widest text-white/70 uppercase">
            Optional
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SCORES.map((score) => {
          const isSelected = value === score

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center border text-sm font-semibold transition',
                isSelected
                  ? 'border-warning/70 bg-warning/15 text-white'
                  : 'border-white/5 bg-white/5 hover:bg-white/10 text-white/70 hover: hover:text-white'
              )}
            >
              {score}
            </button>
          )
        })}
      </div>
    </div>
  )
}
