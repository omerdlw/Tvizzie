'use client';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const SCORES = [1, 2, 3, 4, 5, 0.5, 1.5, 2.5, 3.5, 4.5];

export default function RatingSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon="solar:star-bold" size={15} className="text-[#b45309]" />
          <span className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Your Score</span>
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] font-semibold tracking-widest text-[#475569] uppercase transition"
          >
            Clear
          </button>
        ) : (
          <span className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Optional</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SCORES.map((score) => {
          const isSelected = value === score;

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center border text-sm font-semibold transition',
                isSelected
                  ? 'border-[#ca8a04] bg-[#fef08a] text-[#713f12]'
                  : 'border-[#94a3b8] bg-[#e2e8f0] text-black/70'
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
