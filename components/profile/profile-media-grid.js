'use client'

import ContentCard from '@/components/home/content-card'

export function MediaGrid({ items, renderOverlay = null }) {
    return (
        <div className="stagger-container mt-5 flex flex-wrap gap-x-3 gap-y-6 md:gap-x-[13.3333px] md:gap-y-8 lg:gap-x-4 lg:gap-y-10">
            {items.map((item, index) => (
                <div
                    key={item.id || index}
                    className="fade-up relative w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-40px)/4)] lg:w-[calc((100%-80px)/6)]"
                    style={{ '--delay': `${index * 0.05}s` }}
                >
                    <ContentCard item={item} className="w-full transition-transform duration-500 hover:scale-[1.03]" />
                    {typeof renderOverlay === 'function' ? renderOverlay(item) : null}
                </div>
            ))}
        </div>
    )
}
