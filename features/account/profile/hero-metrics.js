import Link from 'next/link';

import { cn } from '@/core/utils';

export function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

export function createHeroCollectionMetaItem(count, singular, plural = `${singular}s`, options = {}) {
  const safeCount = Number(count) || 0;

  return {
    ...options,
    label: safeCount === 1 ? singular : plural,
    value: formatHeroCount(safeCount),
  };
}

export function HeroRevealItem({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

function HeroInlineMetric({ item, className = '', labelClassName = '', valueClassName = '' }) {
  const content = (
    <>
      <span className={valueClassName}>{item.value}</span>
      <span className={labelClassName}>{item.label}</span>
    </>
  );
  const wrapperClassName = cn(className, (item.href || typeof item.onClick === 'function') && ' ');

  if (item.href) {
    return (
      <Link href={item.href} className={wrapperClassName}>
        {content}
      </Link>
    );
  }

  if (typeof item.onClick === 'function') {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={cn('border-0 bg-transparent p-0 text-left', wrapperClassName)}
      >
        {content}
      </button>
    );
  }

  return <span className={wrapperClassName}>{content}</span>;
}

export function HeroTextContent({ countsLabel, displayName, mobileStats }) {
  return (
    <div className="w-full min-w-0 text-left">
      <HeroRevealItem className="flex items-center gap-4">
        <h1 className="font-zuume max-w-full min-w-0 text-[2.9rem] leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-[3.6rem] lg:text-[4.8rem]">
          {displayName}
        </h1>
      </HeroRevealItem>

      <div className="mt-2 flex flex-col gap-0.5 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 min-[420px]:grid-cols-3 lg:hidden">
          {mobileStats.map((item, index) => (
            <HeroRevealItem key={`${item.label}-${item.value}-${index}`}>
              <HeroInlineMetric
                item={item}
                className="inline-flex min-w-0 flex-col items-start gap-0.5 text-left"
                valueClassName="text-base font-semibold leading-none tracking-tight"
                labelClassName="max-w-full truncate text-[13px] leading-none text-white/70"
              />
            </HeroRevealItem>
          ))}
        </div>

        <div className="hidden items-center gap-x-6 gap-y-2 lg:flex lg:gap-x-7">
          {countsLabel.map((item, index) => (
            <HeroRevealItem key={`${item.label}-${item.value}-${index}`}>
              <HeroInlineMetric
                item={item}
                className="inline-flex items-baseline gap-1.5 whitespace-nowrap"
                valueClassName="text-base font-semibold leading-none tracking-tight "
                labelClassName="text-base leading-none text-white/70"
              />
            </HeroRevealItem>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroStatsGrid({ stats, className = '', itemClassName = '', labelClassName = '', valueClassName = '' }) {
  return (
    <div className={className}>
      {stats.map((stat, index) => {
        const content = (
          <>
            <div className={valueClassName}>{formatHeroCount(stat.value)}</div>
            <div className={labelClassName}>{stat.label}</div>
          </>
        );

        return (
          <HeroRevealItem key={`${stat.label}-${stat.value}-${index}`}>
            {stat.href ? (
              <Link href={stat.href} className={cn(itemClassName, '')}>
                {content}
              </Link>
            ) : typeof stat.onClick === 'function' ? (
              <button
                type="button"
                onClick={stat.onClick}
                className={cn('border-0 bg-transparent p-0', itemClassName, '')}
              >
                {content}
              </button>
            ) : (
              <div className={itemClassName}>{content}</div>
            )}
          </HeroRevealItem>
        );
      })}
    </div>
  );
}
